"use strict";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CSS_CLASSES = {
    DATEPICKER: "datepicker",
    CALENDAR: "calendar",
    HEADER: "header",
    DAYS: "days",
    DATES: "dates",
    DAY: "day",
    DATE: "date",
    OTHER_DATE: "otherDate",
    TODAY: "today",
    SELECTED: "selected"
};

class DatePicker {
    constructor(id, callback) {
        this.id = id;
        this.callback = callback;
    }
    
    render(date) {
        this.date = date;
        this.monthInfo = DatePicker.getMonthInfo(date);
        this.initDatePickerContainer();
        this.createCalendar();
        this.renderCalendar();
    }

    initDatePickerContainer() {
        this.datepicker = document.getElementById(this.id);
        this.datepicker.innerHTML = '';
        this.datepicker.classList.add(CSS_CLASSES.DATEPICKER);
    }

    createCalendar() {
        this.calendar = document.createElement('div');
        this.calendar.classList.add(CSS_CLASSES.CALENDAR);
        this.datepicker.append(this.calendar);
    }

    renderCalendar() {
        this.renderHeader();
        this.renderDays();
        this.renderDates();
        this.clearSelection();
    }

    renderHeader() {
        const header = document.createElement('div');
        header.classList.add(CSS_CLASSES.HEADER);

        header.append(
            this.createNavButton('<', -1),
            this.createMonthYear(),
            this.createNavButton('>', 1),
        );

        this.calendar.append(header);
    }

    createNavButton(text, monthOffset) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', () => {
            const newDate = new Date(
                this.monthInfo.year,
                this.monthInfo.month+monthOffset,
                1
            );
            this.render(newDate);
        });
        return button;
    }

    createMonthYear() {
        const display = document.createElement('div');
        display.textContent = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long'
        }).format(this.date);
        return display;
    }
    
    renderDays() {
        const daysContainer = document.createElement('div');
        daysContainer.classList.add(CSS_CLASSES.DAYS);

        DAYS_OF_WEEK.forEach(day => {
            daysContainer.append(DatePicker.createDayCell(day));
        });

        this.calendar.append(daysContainer);
    }

    static createDayCell(day) {
        const cell = document.createElement('div');
        cell.textContent = day;
        cell.classList.add(CSS_CLASSES.DAY);
        return cell;
    }

    renderDates() {
        const datesContainer = document.createElement('div');
        datesContainer.classList.add(CSS_CLASSES.DATES);

        datesContainer.append(
            ...this.createPreviousMonthDates(),
            ...this.createCurrentMonthDates(),
            ...this.createNextMonthDates()
        );

        this.calendar.append(datesContainer);
    }

    createPreviousMonthDates() {
        const dates = [];
        const { daysOfLastMonth, startDay } = this.monthInfo;
        for (let i = daysOfLastMonth-startDay+1; i <= daysOfLastMonth; i++) {
            dates.push(DatePicker.createDateCell(i, CSS_CLASSES.OTHER_DATE));
        }
        return dates;
    }

    createCurrentMonthDates() {
        const dates = [];
        const { year, month, daysOfMonth } = this.monthInfo;
        for (let i = 1; i <= daysOfMonth; i++) {
            const cell = DatePicker.createDateCell(i, CSS_CLASSES.DATE);
            if (new Date().toDateString() === new Date(year, month, i).toDateString()) {
                cell.classList.add(CSS_CLASSES.TODAY);
            }
            this.addDateSelectionHandler(cell);
            dates.push(cell);
        }
        return dates;
    }

    createNextMonthDates() {
        const dates = [];
        const { startDay, daysOfMonth } = this.monthInfo;
        const startDayOfNextMonth = (startDay + daysOfMonth) % 7;
        for (let i = 1; i <= 7-startDayOfNextMonth; i++) {
            dates.push(DatePicker.createDateCell(i, CSS_CLASSES.OTHER_DATE));
        }
        return dates;
    }

    static getMonthInfo(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDate = new Date(year, month, 1);
        const daysOfMonth = new Date(year, month + 1, 0).getDate();
        const daysOfLastMonth = new Date(year, month, 0).getDate();
        const startDay = firstDate.getDay();
        return {
            year: year,
            month: month,
            daysOfMonth: daysOfMonth,
            daysOfLastMonth: daysOfLastMonth,
            startDay: startDay
        };
    }

    static createDateCell(text, className) {
        const cell = document.createElement('div');
        cell.textContent = text;
        cell.classList.add(className);
        return cell;
    }

    addDateSelectionHandler(cell) {
        cell.addEventListener('click', () => {
            this.selectDate(new Date(this.year, this.month, Number(cell.textContent)));
            this.updateSelectedCell(cell);
        });
    }

    selectDate(date) {
        this.callback(this.id, {
            month: date.getMonth()+1,
            day: date.getDate(),
            year: date.getFullYear()
        });
    }

    updateSelectedCell(cell) {
        this.clearSelection();
        cell.classList.add(CSS_CLASSES.SELECTED);
        this.selected = cell;
    }

    clearSelection() {
        if (this.selected) {
            this.selected.classList.remove(CSS_CLASSES.SELECTED);
            this.selected = null;
        }
    }
}