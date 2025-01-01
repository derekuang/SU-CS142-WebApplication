'use strict';

const all = -1;
const none = -2;

class TableTemplate {
    static fillIn(id, dict, columnName) {
        const table = document.getElementById(id);
        table.style.visibility = "visible";

        const tBody = table.tBodies[0];
        const rows = tBody.rows;

        const headerRow = rows[0];
        const headerCells = headerRow.cells;
        let index = columnName ? none : all;
        for (const cell of headerCells) {
            cell.textContent = cell.textContent.replace(/{{(.*?)}}/g, (match, p1) => dict[p1] || '');
            index = cell.textContent === columnName ? cell.cellIndex : index;
        }

        if (index === none) return;
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].cells;
            for (let j = 0; j < cells.length; j++) {
                if (index === all || j === index) {
                    cells[j].textContent = cells[j].textContent.replace(/{{(.*?)}}/g, (match, p1) => dict[p1] || '');
                }
            }
        }
    }
}
