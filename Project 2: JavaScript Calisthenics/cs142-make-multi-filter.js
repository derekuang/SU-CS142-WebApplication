"use strict";

function isFunction(obj) {
	return typeof obj === "function";
}

function cs142MakeMultiFilter(originalArray) {
	let currentArray = originalArray;

	return function arrayFilter(filterCriteria, callback) {
		if(!isFunction(filterCriteria)) {
			return currentArray;
		}
		currentArray = currentArray.filter(filterCriteria);
		
		if(isFunction(callback)) {
			callback.call(originalArray, currentArray);
		}
		
		return arrayFilter;
	};
}
