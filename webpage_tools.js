/*
	Webpage tools
	Niels Groot Obbink
*/

const path = require('path'),
      fs = require('fs'),
      cheerio = require('cheerio'),
      esprima = require('esprima');

function get_functions(entry) {
	let functions = [];
	let source_code = entry.source;

	// Parse the source code, retrieve function nodes including range data.
	esprima.parse(source_code, {range: true}, function(node) {

		// TODO fix, there are more node types declaring functions.
		if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression') {
			let function_data = {
				type: null,
				name: null,

				start: node.range[0],
				end: node.range[1],

				body: {
					start: node.body.range[0],
					end: node.body.range[1]
				}
			};

			// TODO fix node.types; why not just use the esprima type for flexibility
			if(node.type == 'FunctionDeclaration') {
				function_data.type = 'declaration';
				function_data.name = node.id.name;
			} else {
				// If it's not a FunctionDeclaration, it must be a FunctionExpression.
				function_data.type = 'expression';
			}

			// Special case: if inline js, add offset to location.
			if(entry.type == 'inline')
			{
				var inlineOffset = entry.location.start;
				function_data.start += inlineOffset;
				function_data.end += inlineOffset;
				function_data.body.start += inlineOffset;
				function_data.body.end += inlineOffset;
			}

			// Save the function data.
			functions.push(function_data);
		}
	});

	return functions;
}


let get_scripts = function (html_file) {
	let directory = path.dirname(html_file);

	let scripts = {
		normal: [],
		async: [],
		defered: []
	};

	let source = fs.readFileSync(html_file).toString();
	let html = cheerio.load(source);
	let script_tags = html('script');
	

	// Keep track of covered external scripts to prevent duplicates
	let sources = [];

	let id = 0; // unique counter index
	script_tags.each(function(index, element) {

		// script format
		let entry = {
			id: id,				// id, for easier lookup.
			type: null,			// 'inline', 'script'
			source: null,		// source code
			functions: null,	// list of functions and location: get_functions()
			location: null,		// if type is 'inline', the offset of the code in the HTML document {start: <Number>, end: <Number>}.
			full_path: null, 	// absolute path to file (relative to process)
			full_path_indexed: null, // identifier

			 // not needed right?
			file: null,			// file name of the script
			file_indexed: null,  // identifier
			
		};

		if(element.attribs.hasOwnProperty('src')) { // External script.
			let src = element.attribs['src'];
			let parsed_path = path.join( directory, src );

			// Already added this script
			if (sources.includes(parsed_path)) { return; }
			
			sources.push( parsed_path );

			entry.type = 'script';
			entry.source = fs.readFileSync( parsed_path ).toString();
			entry.file = src;
			entry.full_path = parsed_path;

			entry.file_indexed = entry.file;
			entry.full_path_indexed = entry.full_path;
		} else { // internal script
			let content = cheerio(element).html()
			let start = source.indexOf(content);

			if (start == -1) { throw 'webpage_tools error: can\'t find start location for inline script file ' + index; }

			entry.type = 'inline';
			entry.file = path.basename(html_file);
			entry.full_path = html_file;
			entry.location = { start: start, end: start + content.length };
			entry.source = content;

			entry.file_indexed = entry.file + '#' + id;
			entry.full_path_indexed = entry.full_path + '#' + id;
		}

		try { entry.functions = get_functions(entry);
		} catch(exception) {
			throw 'webpage_tools error: JS parse error: ' + exception;
		}

		if(element.attribs.hasOwnProperty('async') ) {
			scripts.async.push(entry);
		} else if(element.attribs.hasOwnProperty('defer')) {
			scripts.defered.push(entry);
		} else {
			scripts.normal.push(entry);
		}

		id++;
	});

	// first normal scripts, then defered, then async. (slowest first)
	return scripts.normal.concat(scripts.defered).concat(scripts.async);
};


module.exports =
{
	get_scripts: get_scripts
}
