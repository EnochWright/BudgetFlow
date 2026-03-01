/**
 * Local data service for Budget Flow
 * Uses localStorage for web persistence in the browser/PWA context.
 */

const STORAGE_KEY_RULES = 'ebf_rules';
const STORAGE_KEY_ACTUALS = 'ebf_actuals';

window.db = {
    // -----------------------------------------
    // Rules (Projections)
    // -----------------------------------------
    getRules() {
        const data = localStorage.getItem(STORAGE_KEY_RULES);
        return data ? JSON.parse(data) : [];
    },

    saveRule(rule) {
        const rules = this.getRules();
        if (rule.id) {
            const idx = rules.findIndex(r => r.id === rule.id);
            if (idx > -1) {
                rules[idx] = rule;
            } else {
                rules.push(rule);
            }
        } else {
            rule.id = 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            rules.push(rule);
        }
        localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
        return rule;
    },

    deleteRule(id) {
        let rules = this.getRules();
        rules = rules.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    },

    getRuleById(id) {
        return this.getRules().find(r => r.id === id);
    },

    // -----------------------------------------
    // Actuals (Transactions)
    // -----------------------------------------
    getActuals() {
        const data = localStorage.getItem(STORAGE_KEY_ACTUALS);
        return data ? JSON.parse(data) : [];
    },

    saveActual(actual) {
        const actuals = this.getActuals();
        if (actual.id) {
            const idx = actuals.findIndex(a => a.id === actual.id);
            if (idx > -1) {
                actuals[idx] = actual;
            } else {
                actuals.push(actual);
            }
        } else {
            actual.id = 'actual_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            actuals.push(actual);
        }
        localStorage.setItem(STORAGE_KEY_ACTUALS, JSON.stringify(actuals));
        return actual;
    },

    deleteActual(id) {
        let actuals = this.getActuals();
        actuals = actuals.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY_ACTUALS, JSON.stringify(actuals));
    },

    getActualById(id) {
        return this.getActuals().find(a => a.id === id);
    },

    // -----------------------------------------
    // Wipes all local tracking data
    // -----------------------------------------
    clearAll() {
        localStorage.removeItem(STORAGE_KEY_RULES);
        localStorage.removeItem(STORAGE_KEY_ACTUALS);
    }
};
