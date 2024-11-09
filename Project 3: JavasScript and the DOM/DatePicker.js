"use strict";

class DatePicker {
    constructor(id, callback) {
        this.id = id;
        this.callback = callback;
    }
    
    render(date) {
    }
    
    selectDate(date) {
        const obj = {
            month: date.getMonth(),
            day: date.getDay(),
            year: date.getFullYear()
        };
        this.callback(this.id, obj);
    }
}