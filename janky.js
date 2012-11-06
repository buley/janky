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
, in_frames = [];

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
	var finished_data = {
		all: null,
		bad: null,
		good: null
	};

	var do_all = function() {
		var _all_frames = new gauss.Vector( all_frames );
		_all_frames.min( function(min) {
			//console.log("MIN", min);
			_all_frames.max( function(max) {
				//console.log("MAX", max);
				_all_frames.mean( function(mean) {
					//console.log("MEAN", mean);
					_all_frames.median( function(median) {
						//console.log("MEDIAN", median);
						_all_frames.median( function(range) {
							//console.log("RANGE", range);
							_all_frames.variance( function(variance) {
								//console.log("VARIANCE", variance);
								_all_frames_floored = _all_frames.map( function(frame) { return Math.floor( frame ) } );
								_all_frames_floored.distribution( 'absolute', function(distribution) {
									//console.log("DISTRIBUTION", distribution);
									_all_frames.quantile( 11, function(quantile) {
										//console.log("QUANTILE", quantile);
										_all_frames.sma( 5, function(sma) {
											//console.log("MOVING AVERAGE", sma);
											finished_data.all = {
												min: min,
												max: max,
												mean: mean,
												median: median,
												range: range,
												variance: variance,
												distribution: distribution,
												quantile: quantile,
												sma: sma
											};
											//console.log('finished all');
											do_good();
										} );
									} );
								} );
							} );
						} );
					} );
				} );
			} );
		} );
	};

	var do_good = function() {
		var _good_frames = new gauss.Vector( good_frames );
		_good_frames.min( function(min) {
			//console.log("MIN", min);
			_good_frames.max( function(max) {
				//console.log("MAX", max);
				_good_frames.mean( function(mean) {
					//console.log("MEAN", mean);
					_good_frames.median( function(median) {
						//console.log("MEDIAN", median);
						_good_frames.median( function(range) {
							//console.log("RANGE", range);
							_good_frames.variance( function(variance) {
								//console.log("VARIANCE", variance);
								_good_frames_floored = _good_frames.map( function(frame) { return Math.floor( frame ) } );
								_good_frames_floored.distribution( 'absolute', function(distribution) {
									//console.log("DISTRIBUTION", distribution);
									_good_frames.quantile( 11, function(quantile) {
										//console.log("QUANTILE", quantile);
										_good_frames.sma( 5, function(sma) {
											//console.log("MOVING AVERAGE", sma);
											finished_data.good = {
												min: min,
												max: max,
												mean: mean,
												median: median,
												range: range,
												variance: variance,
												distribution: distribution,
												quantile: quantile,
												sma: sma
											};										
											//console.log('finished good');
											if( bad_frames.length === 0 ) {
												delete finished_data.bad;
												do_output();				
											} else {				
												do_bad();
											}
										} );
									} );
								} );
							} );
						} );
					} );
				} );
			} );
		} );
	};

	var do_bad = function() {
		var _bad_frames = new gauss.Vector( bad_frames );
		_bad_frames.min( function(min) {
			//console.log("MIN", min);
			_bad_frames.max( function(max) {
				//console.log("MAX", max);
				_bad_frames.mean( function(mean) {
					//console.log("MEAN", mean);
					_bad_frames.median( function(median) {
						//console.log("MEDIAN", median);
						_bad_frames.median( function(range) {
							//console.log("RANGE", range);
							_bad_frames.variance( function(variance) {
								//console.log("VARIANCE", variance);
								_bad_frames_floored = _bad_frames.map( function(frame) { return Math.floor( frame ) } );
								_bad_frames_floored.distribution( 'absolute', function(distribution) {
									//console.log("DISTRIBUTION", distribution);
									_bad_frames.quantile( 11, function(quantile) {
										//console.log("QUANTILE", quantile);
										_bad_frames.sma( 5, function(sma) {
											//console.log("MOVING AVERAGE", sma);
											finished_data.bad = {
												min: min,
												max: max,
												mean: mean,
												median: median,
												range: range,
												variance: variance,
												distribution: distribution,
												quantile: quantile,
												sma: sma
											};
											//console.log('finished bad');
											do_output();								
										} );
									} );
								} );
							} );
						} );
					} );
				} );
			} );
		} );
	};

	var do_output = function() {

		var table = new Table( {
			head: [ 'Type', 'Min', 'Max', 'Mean', 'Median', 'Range', 'Variance' ],
			colWidths: [ 10, 10, 10, 10, 10, 10, 10 ]
		} );

		var table_2 = new Table( {
			head: [ 'type', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17+' ],
			colWidths: [ 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ]
		} );

		var table_3 = new Table( {
			head: [ 'type', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%' ], 
			colWidths: [ 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 ]
		} );


		for( var type in finished_data ) {
			if( finished_data.hasOwnProperty( type ) ) {
				var obj = finished_data[ type ];
				table.push( 
					[ type, obj.min, obj.max, obj.mean, obj.median, obj.range, obj.variance ]
				);
				table_2_arr = [ type ];
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

				table_3_arr = [ type ];
				var ct = 0;
				for( var attr in obj.distribution ) {
					if ( obj.quantile.hasOwnProperty( attr ) ) {
						table_3_arr.push( obj.quantile[ attr ] );
					}
				}
				table_3.push( table_3_arr );


			}
			console.log("######################");
			console.log(">>>>> " + type.toUpperCase() + " FRAMES <<<<<" );
			console.log("######################");
			console.log();
			console.log();
			console.log("###############################");
			console.log("####### FRAME STATISTICS ######");
			console.log("###############################");
			console.log( table.toString() );
			console.log();
			console.log();
			console.log("###############################");
			console.log("### FRAME DISTRIBUTION (ms) ###");
			console.log("###############################");
			console.log( table_2.toString() );
			console.log();
			console.log();
			console.log("###############################");
			console.log("#### FRAME QUANTILES (ms) #####");
			console.log("###############################");
			console.log( table_3.toString() );
			console.log();
			console.log();
		}
	};

	do_all();
} );
