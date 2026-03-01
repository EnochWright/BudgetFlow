/**
 * projections.js
 * Generates the projected cash flow map based on rules and actuals.
 */

window.projections = {

    /**
     * Parses a YYYY-MM-DD string as a local Date to prevent UTC midnight shifting
     */
    parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr.includes('-')) {
            const [y, m, d] = dateStr.split('-');
            return new Date(y, m - 1, d);
        }
        return new Date(dateStr);
    },

    /**
     * Formats a Date object into a YYYY-MM-DD string strictly using local time.
     */
    formatLocalDate(d) {
        if (!d) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    /**
     * Determines how many days early/late a transaction can be logged and still be considered matched
     */
    getToleranceDays(frequency) {
        switch (frequency) {
            case 'weekly': return 3;
            case 'monthly': return 8;
            case 'one-off': return 5;
            default: return 7;
        }
    },

    /**
     * Engine to generate future daily balances based on current rules and actuals.
     * @param {number} daysToProject The number of days to project into the future. Defaults to 90.
     * @returns {Array} Array of daily projection objects
     */
    generateProjections(daysToProject = 90) {
        const rules = window.db.getRules();
        const actuals = window.db.getActuals();

        // Find the most recent actual to establish the base balance
        // If no actuals, default to 0
        let baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);

        let runningBalance = 0;
        if (actuals.length > 0) {
            // Re-calculate the absolute current balance based on all actuals
            runningBalance = actuals.reduce((sum, item) => {
                if (item.isSkip) return sum; // don't add/subtract skips
                const amt = parseFloat(item.amount);
                return item.type === 'inflow' ? sum + amt : sum - amt;
            }, 0);
        }

        const projections = [];

        // Past Due Logic: Scan the past 30 days to find unpaid occurrences
        const todayForPastDue = new Date();
        todayForPastDue.setHours(0, 0, 0, 0);
        const pastDueEvents = [];
        let pastDueTotal = 0;

        for (let j = 1; j <= 30; j++) {
            const pastDate = new Date(todayForPastDue);
            pastDate.setDate(pastDate.getDate() - j);

            rules.forEach(rule => {
                if (this.doesRuleTriggerOnDate(rule, pastDate)) {
                    const toleranceDays = this.getToleranceDays(rule.frequency);
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const projectionTime = pastDate.getTime();

                    const hasMatchingActual = actuals.some(a => {
                        const actualDate = this.parseLocalDate(a.date);
                        actualDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.abs((projectionTime - actualDate.getTime()) / msPerDay);
                        return a.name.toLowerCase() === rule.name.toLowerCase() && diffDays <= toleranceDays;
                    });

                    if (!hasMatchingActual) {
                        const amount = parseFloat(rule.amount);
                        if (rule.type === 'inflow') {
                            pastDueTotal += amount;
                            pastDueEvents.push({ name: 'Past Due: ' + rule.name, type: 'inflow', amount, isPastDue: true });
                        } else {
                            pastDueTotal -= amount;
                            pastDueEvents.push({ name: 'Past Due: ' + rule.name, type: 'outflow', amount, isPastDue: true });
                        }
                    }
                }
            });
        }

        const rawActualBalance = runningBalance;
        let todayDeductions = 0;

        // Loop through each day from baseDate to baseDate + daysToProject
        for (let i = 0; i <= daysToProject; i++) {
            const currentDate = new Date(baseDate);
            currentDate.setDate(currentDate.getDate() + i);

            const dateStr = this.formatLocalDate(currentDate);
            let dailyTotal = 0;
            const events = [];

            // Check each rule to see if it triggers on this day
            rules.forEach(rule => {
                if (this.doesRuleTriggerOnDate(rule, currentDate)) {

                    // --- DOUBLE COUNTING CHECK ---
                    // If there's an actual transaction logged within the tolerance window of this projection
                    // with the exact same name as the rule, we assume the user already paid it.
                    const toleranceDays = this.getToleranceDays(rule.frequency);
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const projectionTime = currentDate.getTime();

                    const hasMatchingActual = actuals.some(a => {
                        const actualDate = this.parseLocalDate(a.date);
                        // Normalize to midnight for fair comparison
                        actualDate.setHours(0, 0, 0, 0);

                        const actualTime = actualDate.getTime();
                        const diffDays = Math.abs((projectionTime - actualTime) / msPerDay);

                        return a.name.toLowerCase() === rule.name.toLowerCase() && diffDays <= toleranceDays;
                    });

                    if (hasMatchingActual) {
                        return; // Skip projecting
                    }

                    const amount = parseFloat(rule.amount);
                    if (rule.type === 'inflow') {
                        dailyTotal += amount;
                        events.push({ name: rule.name, type: 'inflow', amount });
                    } else {
                        dailyTotal -= amount;
                        events.push({ name: rule.name, type: 'outflow', amount });
                    }
                }
            });

            // Inject past due items on the very first forecasted day (Today)
            if (i === 0) {
                dailyTotal += pastDueTotal;
                events.push(...pastDueEvents);
                todayDeductions = dailyTotal; // Capture specifically what is happening today + past due
            }

            runningBalance += dailyTotal;

            projections.push({
                date: dateStr,
                balance: runningBalance,
                events: events
            });
        }

        return {
            projections,
            rawActualBalance,
            todayDeductions
        };
    },

    doesRuleTriggerOnDate(rule, targetDate) {
        const start = this.parseLocalDate(rule.startDate);
        start.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        if (targetDate < start) return false;
        if (rule.endDate) {
            const end = this.parseLocalDate(rule.endDate);
            end.setHours(0, 0, 0, 0);
            if (targetDate > end) return false;
        }

        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const ruleDay = parseInt(rule.dayOfMonth) || start.getDate();

        switch (rule.frequency) {
            case 'monthly':
                if (targetDay === ruleDay) return true;
                const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                if (targetDay === lastDayOfMonth && ruleDay > lastDayOfMonth) return true;
                return false;

            case 'weekly':
                const startDayOfWeek = parseInt(rule.dayOfWeek) || 0;
                if (targetDate.getDay() === startDayOfWeek) return true;
                return false;

            case 'one-off':
                return start.getTime() === targetDate.getTime();

            default:
                return false;
        }
    },

    /**
     * Finds the immediate next date a rule will trigger, or the oldest unpaid past occurrence.
     */
    getNextOccurrenceDate(rule, actuals) {
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        // Scan backwards up to 30 days to find an un-logged past occurrence
        if (actuals) {
            let pastScan = new Date(checkDate);
            pastScan.setDate(pastScan.getDate() - 30);

            for (let i = 0; i < 30; i++) {
                if (this.doesRuleTriggerOnDate(rule, pastScan)) {
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const scanTime = pastScan.getTime();

                    const tolerance = this.getToleranceDays(rule.frequency);

                    const hasMatchingActual = actuals.some(a => {
                        const actualDate = this.parseLocalDate(a.date);
                        actualDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.abs((scanTime - actualDate.getTime()) / msPerDay);
                        return a.name.toLowerCase() === rule.name.toLowerCase() && diffDays <= tolerance;
                    });

                    if (!hasMatchingActual) {
                        return this.formatLocalDate(pastScan);
                    }
                }
                pastScan.setDate(pastScan.getDate() + 1);
            }
        }

        // Scan up to 1 year into the future
        for (let i = 0; i < 365; i++) {
            if (this.doesRuleTriggerOnDate(rule, checkDate)) {
                let alreadyLogged = false;
                if (actuals) {
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const scanTime = checkDate.getTime();
                    const tolerance = this.getToleranceDays(rule.frequency);
                    alreadyLogged = actuals.some(a => {
                        const actualDate = this.parseLocalDate(a.date);
                        actualDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.abs((scanTime - actualDate.getTime()) / msPerDay);
                        return a.name.toLowerCase() === rule.name.toLowerCase() && diffDays <= tolerance;
                    });
                }
                if (!alreadyLogged) {
                    return this.formatLocalDate(checkDate);
                }
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
        return null; // No occurrence found in next year
    }
};
