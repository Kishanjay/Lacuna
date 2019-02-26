'use strict';

require('./native_extentions');

const argument_parser = require('command-line-args'),
	fs = require('fs-extra'),
      path = require('path'),
      csv_factory = require('./csv.js'),
      jdce = require('./jdce.js');



let options;
try {
	options = argument_parser([
		{ name: 'directory', type: String, defaultOption: true },
		{ name: 'index', type: String, alias: 'i' },
		{ name: 'csv', type: Boolean, alias: 'c' },
		{ name: 'csvfile', type: String, alias: 'f' },
		{ name: 'graph', type: Boolean, alias: 'g' },
		{ name: 'graphfile', type: String, alias: 'd' },
		{ name: 'verbose', type: Boolean, alias: 'v' },
		{ name: 'analyzer', type: String, multiple: true, alias: 'a' },
		{ name: 'noremove', type: Boolean, alias: 'n' },
		{ name: 'entire', type: Boolean, alias: 'e' },
		{ name: 'timeout', type: Number, alias: 't' },
		{ name: 'missteps', type: Boolean, alias: 'm' },

		/* 0: passive (doesn't modify source), 1: lazy-loading, 2: emptying, 3: removing all together */
		{ name: 'olevel', type: Number, alias: 'o' }, // optimization level

		/* Preserve original */
		{ name: 'preserve', type: Boolean, alias: 'p' }, // makes a copy of the working dir before starting
	]);
} catch(exception) {
	console.log(exception.message);
	process.exit(1);
}


if( ! options['directory'] ) {
	console.error('No directory specified.');
	process.exit(2);
}

/* preserve original directory */
if (options['preserve']) {
	let originalDir = options['directory'];
	let lacunaDir = path.join(path.dirname(originalDir), path.basename(originalDir)) + "_lacunized";
	options['directory'] = lacunaDir;
	fs.copySync(originalDir, lacunaDir);
}

// Extend our default settings with the command line arguments (if available).
let settings = {
	index: 'index.html',
	verbose: false,
	csv: false,
	csvfile: 'output.csv',
	graph: false,
	graphfile: 'output.dot',
	analyzer: [], // string containing the analyzers.
	noremove: false,
	entire: false,
	pace: false, // log which analyser is running? 
	missteps: false,
	level: 2,
}.extend(options);


// Add the complete HTML file path to the settings for easy access.
settings.html_path = path.join(settings.directory, settings.index);


// Create a CSV output instance. (only used when the --csv option is on)
let csv = new csv_factory(settings.csvfile, function(data) {
	// Filter function; preprocess data to uniform output.
	return [
		settings.directory,
		data.js_files,
		data.function_count,
		data.functions_removed,
		data.run_time,
		data.analyzer_info,
		data.error
	];
});


// Check if directory and HTML file exist.
if( ! fs.existsSync(settings.directory) ){
	let error_message = 'Directory ' + settings.directory + ' doesn\'t exist or isn\'t readable';

	if(settings.csv) {
		csv.append({error: error_message});
	}
	console.error(error_message);
	process.exit(3);
}

if( ! fs.existsSync(settings.html_path) ) {
	let error_message = 'File ' + settings.html_path + ' doesn\'t exist or isn\'t readable';

	if(settings.csv) {
		csv.append({error: error_message});
	}
	console.error(error_message);
	process.exit(4);
}


if( settings.analyzer.length == 0 ) {
	console.log('Warning: no analyzer(s) specified. No functions will be removed. Use the --analyzer command line option to specify the algorithms to use.');
	settings.noremove = true;
}


try {
	jdce.run({
		directory: settings.directory,
		html_path: settings.html_path,
		analyzer: settings.analyzer,
		noremove: settings.noremove,
		graph: settings.graph,
		show_disconnected: settings.entire,
		timeout: settings.timeout,
		missteps: settings.missteps,
		level: settings.olevel
	}, function (results) {
		/* callback functions containing the statistics */
			
		if( settings.csv ) {
			csv.append(results);
		}

		if( settings.graph ) {
			fs.writeFileSync( settings.graphfile, results.graph );
		}

		if( settings.verbose ) {
			delete results.graph; // Never show graph DOT string in output
			console.log(results);
		}
	});
} catch(error) {
	console.log('jdce.js error:');
	console.log(error);
}
