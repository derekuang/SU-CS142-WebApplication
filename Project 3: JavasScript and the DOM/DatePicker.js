"use strict";

class DatePicker {
    constructor(id, callback) {
        this.id = id;
        this.callback = callback;
    }
    
    render(date) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
        const startWeekday = firstDayOfMonth.getDay();

        const calendar = document.createElement('table');
        calendar.setAttribute('class', "calendar");
        
        const top = document.createElement('tr');
        const prev = document.createElement('td');
        prev.textContent = "<";
        top.append(prev);
        const monthYear = document.createElement('td');
        monthYear.textContent = monthNames[date.getMonth()] + " " + date.getFullYear();
        top.append(monthYear);
        const next = document.createElement('td');
        next.textContent = ">";
        top.append(next);
        calendar.append(top);

        const weekDays = document.createElement('tr');
        for (const day of daysOfWeek) {
            const cell = document.createElement('td');
            cell.textContent = day + " ";
            weekDays.append(cell);
        }
        calendar.append(weekDays);
        
        const datepicker = document.getElementById(this.id);
        datepicker.append(calendar);
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