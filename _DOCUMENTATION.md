# Documentation of the source
The entry point of Lacuna is `lacuna.js`

## Lacuna.js
This file at the top parses the command-line arguments and computes the 'options'
that it will be using based on the fixed preset and arguments.

Further more some error checking is done.

Then the jdce.run function is called, which does the actual dead code 
detection and elimination.

## jdce.js
JavaScript dynamic dead code elimination tool
This file uses webpage_tools to gather all JS scripts 
and then uses graph_tools to generate the call graph.

Further more it calls: async_loop(analyzers.functions, analyzer_settings, function(analyzer_run_info)
which I believe takes the Graph with it in the settings, and then uses the analyser
to mark edges of that graph.

## async_retval_loop
contains the actual loop of running the different analysers.

## webpage_tools
Uses Esprima to gather all functions from files.
Almost does a good job at retrieving all functions.

## Analysers
For some reason all analysers return the alive functions in this format:
{caller: {file, start, end}, called: {file, start, end} }
Thus no need to edit these files.



# Notes
The most important thing to really understand is how the analysers work.
Once that is known, generating a clearer codebase should be trivial.
The analysers currently use the exisiting graph and nodes to only mark edges.
The only question that currently is not solved is how the different analysers,
spot these edges between nodes. What kind of way of generalizing do they apply.