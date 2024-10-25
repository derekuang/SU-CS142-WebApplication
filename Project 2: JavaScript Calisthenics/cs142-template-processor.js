"use strict";

class Cs142TemplateProcessor {
    constructor(template) {
        this.template = template;
    }

    fillIn(dictionary) {
        let str = this.template;

        for (const key in dictionary) {
            if (!Object.hasOwn(dictionary, key)) {
                continue;
            }
            str = str.replace("{{" + key + "}}", dictionary[key]);
        }
        
        str = str.replaceAll(/{{\w+}}/g, "");
        
        return str;
    }
}

window.Cs142TemplateProcessor = Cs142TemplateProcessor;
