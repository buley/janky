#!/usr/bin/env node
var path = require('path')
, fs = require('fs')
, file = ''
, stream = fs.createReadStream( path.normalize( process.argv[ 3 ] ) )
, fps = process.argv[ 2 ]
, gauss = require('gauss')
, Table = require('cli-table')
, types = {}
, children_types = {}
, all_frames = []
, good_frames = []
, bad_frames = []
, between_frames = []
, in_frames = []
, show_quantiles = false
, show_distribution = false
, show_stats = false
, show_good = false
, show_bad = false
, show_all = false;

var x = 0, xlen = process.argv.length, xitem;
for (; x < xlen; x += 1) {
	if ( '--quantiles' === process.argv[ x ] ) {
		show_quantiles = true;
	} else if ( '--distribution' === process.argv[ x ] ) {
		show_distribution = true;
	} else if ( '--stats' === process.argv[ x ] ) {
		show_stats = true;
	} else if ( '--good' === process.argv[ x ] ) {
		show_good = true;
	} else if ( '--bad' === process.argv[ x ] ) {
		show_bad = true;
	} else if ( '--all' === process.argv[ x ] ) {
		show_all= true;
	}
}

if ( '30' === fps) {
  fps = 33;
} else if ('60' === fps) {
  fps = 16;
}
stream.on( 'data', function(data) {
	file += data.toString();
} );
stream.on( 'end', function() {
	stream = JSON.parse( file );
	var x = 0, xlen = stream.length, jank_items = {}, previous_item = null, total_items = 0, total_delay = 0, max_delay = 0, min_delay = 100;
    for(; x < xlen; x += 1) {
		var since_item = 0, between_item = 0, in_item = 0, item_key = null;
        item = stream[ x ];
		if ( null !== previous_item ) {
			in_item = item.endTime - item.startTime;
			all_frames.push( in_item );
			between_item = item.startTime - previous_item.endTime;
			between_frames.push( between_item );
		}
		var chain = [];
		var delay = in_item - fps;
		if ( delay > 0 ) {
			bad_frames.push( in_item );
			total_items++;
			total_delay += delay;
			if( delay > max_delay ) {
				max_delay = delay;
			}
			if( delay < min_delay ) {
				min_delay = delay;
			}
			z = 0, zitems = item.children || [], zlen = zitems.length, chain = [];
			for(; z < zlen; z += 1 ) {
				ch = zitems[ z ];
				chain.push(ch.type)
			}
			if( chain.length === 0 ) {
				previous_item = item;
				continue;
			}
			item_key = chain.join(' -> ')
			if ('undefined' === typeof jank_items[ item_key ] ) {
				jank_items[ item_key ] = {};
				jank_items[ item_key ].count = 1;
				jank_items[ item_key ].children = {};
			} else {
				jank_items[ item_key ].count++;
			}
		} else {
			good_frames.push( in_item );
			previous_item = item;
			continue;
		}
		jank_children = jank_items[ item_key ].children;
		var children = item.children, y = 0, ylen = ( 'undefined' !== typeof children ) ? children.length : 0, previous_child = null, child = null;
	    for(; y < ylen; y += 1) {
			child = children[ y ];
			var since_child = 0, between_child = 0;
			if ( null !== previous_child ) {
				since_child = child.endTime - previous_child.endTime;
				between_child = child.startTime - previous_child.endTime;
				if( !isNaN( since_child ) ) {
					if( since_child > fps ) {
						z = 0, zitems = item.children || [], zlen = zitems.length, chain = [], child_key = null;
						for(; z < zlen; z += 1 ) {
							ch = zitems[ z ];
							child_key = ch.type;
							if ('undefined' === typeof jank_items[ child_key ] ) {
								jank_children[ child_key ] = 1;
							} else {
								jank_children[ child_key ]++;
							}
						}
					}
				}
			}
			previous_child = child;
		}
		previous_item = item;
	}

	var do_output = function( all_results ) {

		var table = new Table( {
			head: [ 'Type', 'Min', 'Max', 'Mean', 'Median', 'Range', 'Variance' ],
			colWidths: [ 10, 10, 10, 10, 10, 10, 10 ]
		} );
		

		var table_2 = new Table( {
			head: [ 'type', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17+' ],
			colWidths: [ 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ]
		} )
		, table_2_arr = [];

		var table_3 = new Table( {
			head: [ 'type', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%' ], 
			colWidths: [ 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 ]
		} )
		, table_3_arr = [];

		for( var data_type in all_results ) {
			if( all_results.hasOwnProperty( data_type ) ) {
				for( var stats_type in all_results[ data_type ] ) {
					if( all_results[ data_type ].hasOwnProperty( stats_type ) ) {
						
						var obj = all_results[ data_type ][ stats_type ];

						if( 'stats' === stats_type && null !== obj ) {
							table.push( 
								[ data_type, obj.min, obj.max, obj.mean, obj.median, obj.range, obj.variance ]
							);
						}
						
						if( 'distribution' === stats_type && null !== obj) {
							table_2_arr = [ data_type ];
							var ct = 0;
							var extra = 0;
							for( var attr in obj.distribution ) {
								if ( obj.distribution.hasOwnProperty( attr ) ) {
									if( ct >= 16 ) {
										extra += obj.distribution[ attr ];
									} else {
										table_2_arr.push( obj.distribution[ attr ] );
									}
									ct++;
								}
							}
							table_2_arr.push( extra );
							table_2.push( table_2_arr );
						}

						if( 'quantiles' === stats_type && null !== obj) {
							table_3_arr = [ data_type ];
							var ct = 0;
							for( var attr in obj.quantiles ) {
								if ( obj.quantiles.hasOwnProperty( attr ) ) {
									table_3_arr.push( obj.quantiles[ attr ] );
								}
							}
							table_3.push( table_3_arr );
						}
					}
				}
			}
		}

		if( show_stats ) {	
			console.log("###############################");
			console.log("####### FRAME STATISTICS ######");
			console.log("###############################");
			console.log( table.toString() );
			console.log();
			console.log();
		}

		if( show_distribution ) {	
			console.log("###############################");
			console.log("### FRAME DISTRIBUTION (ms) ###");
			console.log("###############################");
			console.log( table_2.toString() );
			console.log();
			console.log();
		}

		if( show_quantiles ) {	
			console.log("###############################");
			console.log("#### FRAME QUANTILES (ms) #####");
			console.log("###############################");
			console.log( table_3.toString() );
			console.log();
			console.log();
		}

	};


	var do_distribution = function(coll, callback) {
		coll_floored = coll.map( function(frame) { return Math.floor( frame ) } );
		coll_floored.distribution( 'absolute', function(distribution) {
			//console.log("DISTRIBUTION", distribution);
			callback(coll, { distribution: distribution } );
		} );
	};

	var do_quantiles = function(coll, callback) {
		coll.quantile( 11, function(quantiles) {
			//console.log("QUANTILES", quantiles);
			callback(coll, { quantiles: quantiles  } );
		} );
	};

	var do_stats = function(coll, callback) {
		coll.min( function(min) {
			//console.log("MIN", min);
			coll.max( function(max) {
				//console.log("MAX", max);
				coll.mean( function(mean) {
					//console.log("MEAN", mean);
					coll.median( function(median) {
						//console.log("MEDIAN", median);
						coll.range( function(range) {
							//console.log("RANGE", range);
							coll.variance( function(variance) {
								//console.log("VARIANCE", variance);
								callback( coll, { 
									min: min
									, max: max
									, mean: mean
									, median: median
									, range: range
									, variance: variance
								} );
							} );
						} );
					} );
				} );
			} );
		} ); 	
	};

	var check_finished = function(results) {
		var target = 0, current = 0;
		for( var type in results ) {
			if ( results.hasOwnProperty( type ) ) {
				if ( show_quantiles ) {
					if( 'good' === type && show_good || 'bad' === type && show_bad || 'all' === type && show_all) {
						target++;
						if ( null !== results[ type ][ 'quantiles' ] ) {
							current += 1;
						}
					}
				}
				if ( show_stats ) {
					if( 'good' === type && show_good || 'bad' === type && show_bad || 'all' === type && show_all) {
						target++;
						if ( null !== results[ type ][ 'stats' ] ) {
							current += 1;
						}
					} 
				}
				if ( show_distribution ) {
					if( 'good' === type && show_good || 'bad' === type && show_bad || 'all' === type && show_all) {
						target++;
						if ( null !== results[ type ][ 'distributions' ] ) {
							current += 1;
						}
					}
				}
			}
		}
		console.log("finsihed?",current,target);
		if ( current === target ) {
			return true;
		} else {
			return false;
		}
	};

	var all_results = {
		all: { stats: null, quantiles: null, distribution: null }
		, bad: { stats: null, quantiles: null, distribution: null }
		, good: { stats: null, quantiles: null, distribution: null }
	};

	var do_items = ( function(all_results_obj) {
		var vectors = [];
		if (show_bad) {
			 vectors.push( { type: 'bad', data: new gauss.Vector( bad_frames ) } );
		}
		if (show_good) {
			 vectors.push( { type: 'good', data: new gauss.Vector( good_frames ) } );
		}
		if (show_all) {
			 vectors.push( { type: 'all', data: new gauss.Vector( all_frames ) } );
		}
		var a = 0, alen = vectors.length;
		for(; a < alen; a += 1) {
			var vector_item = vectors[ a ];

			( function( vector, all ) {

				all[ vector.type ] = all[ vector.type ] || {}

				var did_stats = function( coll, results ) {
					all[ vector.type ][ 'stats' ] = results;
					if ( check_finished( all ) )  {
						do_output( all );
					}
				};
				var did_quantiles = function( coll, results ) {
					all[ vector.type ][ 'quantiles' ] = results;
					if ( check_finished( all ) )  {
						do_output( all );
					}
				};
				var did_distribution = function( coll, results ) {
					all[ vector.type ][ 'distribution' ] = results;
					if ( check_finished( all ) )  {
						do_output( all );
					}
				};

				if ( show_stats ) {
					do_stats( vector.data, did_stats );	
				}

				if ( show_distribution ) {
					do_distribution( vector.data, did_distribution );	
				}

				if ( show_quantiles ) {
					do_quantiles( vector.data, did_quantiles );	
				}

			} )( vector_item, all_results_obj )
		}

	} )( all_results );

} );

