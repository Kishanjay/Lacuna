/*
	Async loop
	Niels Groot Obbink

	Executes the functions in array one by one, passing the result, settings object and callback function as arguments.
*/

module.exports = function(functions, settings, callback) {
	let i = -1,
	    length = functions.length,
	    analyzer_results = [];

	// Callback function for the analysers.. I think.
	let loop = function(result) {
		i++;

		// results from the analysers
		if(i >= 1) {
			if( i <= length) {
				analyzer_results.push([settings.fingerprints[i].name, result]);
				
				// done with all analyzers
				if( i == length ) { callback(analyzer_results); }
			}
			return;
		}


		// sloppy
		settings.fingerprint = settings.fingerprints[i + 1];	// +1 for ignoring CONSTRUCTED edge type.
		
		functions[i](settings, loop);
	}
 
	let result = loop(true);
};
