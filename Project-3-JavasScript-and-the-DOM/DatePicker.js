"use strict";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

class DatePicker {
    constructor(id, callback) {
        this.id = id;
        this.callback = callback;
        this.datepicker = null;
        this.calendar = null;
        this.selected = null;
    }
    
    render(date) {
        this.datepicker = document.getElementById(this.id);
        this.datepicker.innerHTML = '';
        this.datepicker.classList.add("datepicker");
        
        this.calendar = document.createElement('div');
        this.calendar.classList.add("calendar");
        this.datepicker.append(this.calendar);
        
        this.render_header(date);
        this.render_days();
        this.render_dates(date);
        
        if (this.selected) {
            this.selected.classList.remove("selected");
            this.selected = null;
        }
    }
    
    // 日历顶部：年月、前后月份导航
    render_header(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        const header = document.createElement('div');
        header.classList.add("header");
        
        const prevMonth = document.createElement('button');
        prevMonth.classList.add("prevMonth");
        prevMonth.textContent = "<";
        prevMonth.addEventListener('click', () => {
            this.render(new Date(year, month-1, 1));
        });
        header.append(prevMonth);

        const monthYear = document.createElement('div');
        monthYear.classList.add("monthYear");
        monthYear.textContent = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date);
        header.append(monthYear);

        const nextMonth = document.createElement('button');
        nextMonth.classList.add("nextMonth");
        nextMonth.textContent = ">";
        nextMonth.addEventListener('click', () => {
            this.render(new Date(year, month+1, 1));
        });
        header.append(nextMonth);

        this.calendar.append(header);
    }

    // 日历星期几抬头
    render_days() {
        const days = document.createElement('div');
        days.classList.add("days"); 

        for (const day of daysOfWeek) {
            const cell = document.createElement('div');
            cell.textContent = day;
            cell.classList.add("day");
            days.append(cell);
        }
        
        this.calendar.append(days);
    }

    // 日历日期
    render_dates(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        const dates = document.createElement('div');
        dates.classList.add("dates");

        const firstDay= new Date(year, month, 1);
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const startDay = firstDay.getDay();

        // 上月日期
        const daysInLastMonth = new Date(year, month, 0).getDate();
        for (let i = daysInLastMonth-startDay+1; i <= daysInLastMonth; i++) {
            const cell = document.createElement('div');
            cell.classList.add("otherDate");
            cell.textContent = i;
            dates.append(cell);
        }
        // 本月日期
        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.classList.add("date");
            if (i === date.getDate()) {
                cell.classList.add("current");
            }
            cell.textContent = i;
            cell.addEventListener('click', () => {
                this.selectDate(new Date(year, month, i));
                if (this.selected) {
                    this.selected.classList.remove("selected");
                }
                cell.classList.add("selected");
                this.selected = cell;
            });
            dates.append(cell);
        }
        // 下月日期
        const startWeekdayNextMonth = (startDay+ daysInMonth) % 7;
        if (startWeekdayNextMonth) {
            for (let i = 1; i <= 7-startWeekdayNextMonth; i++) {
                const cell = document.createElement('div');
                cell.classList.add("otherDate");
                cell.textContent = i;
                dates.append(cell);
            }
        }

        this.calendar.append(dates);
    }

    selectDate(date) {
        const obj = {
            month: date.getMonth()+1,
            day: date.getDate(),
            year: date.getFullYear()
        };
        this.callback(this.id, obj);
    }
}