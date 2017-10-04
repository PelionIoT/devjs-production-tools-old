var util = require('util');
var argv = require('optimist')
    .alias('o','output')
    .alias('O','override')
    .alias('m','merge')
    .describe('m','merge into existing package.json')
    .alias('v','verbose')
    .describe('v','verbose, use a -v2 or -v3 for more information')
    .alias('d','drop')
    .describe('d','drop package')    
    .argv;

var log = function() {
    //var args = Array.prototype.slice.call(arguments);
    //args.unshift("WebDeviceSim");
    console.log.apply(undefined,arguments);
}

var isArray = function(a) {
    return (a.constructor === Array);
}

var log_err = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("ERROR");
    console.error.apply(undefined,args);
}

var excludes = {};

if(argv.d) {
    if(isArray(argv.d)) {
        var n = argv.d.length;
        while(n--) {
            excludes[argv.d[n]] = true;
        }
    } else {
        excludes[argv.d] = true;
    }
}

var log_warn = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("WARN");
    console.error.apply(undefined,args);
}

var verbose = function() {
    if(argv.v) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("verbose:");
        console.log.apply(undefined,args);
    }
}

var verbose2 = function() {
    if(argv.v > 1) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("verbose2:");
        console.log.apply(undefined,args);
    }
}


var outfile = "./package.json";
if(argv.o && argv.m) {
    log_err("Can't use both '-m' and '-o'");
    process.exit(1);
}
if(argv.o) {
    outfile = argv.o;
}
if(argv.m) {
    outfile = argv.m;
}


if(argv._.length < 1) {
    console.log("consolidator.js [ -O overrides_file ] [-o filename | -m filename ] dir [dir...]");
    process.exit(1);
}



var path = require('path');
var fs = require('fs');


var packages = {};

if(argv.m) {
    try {
        json = fs.readFileSync(argv.m, 'utf8');
    } catch(e) {
        log_err("Error reading:",fname);
        log_err("  Details: " + util.inspect(e));
        process.exit(1);
    }
    if(json) {
        try {
            obj = JSON.parse(json)
        } catch(e) {
            log_err("Error parsing JSON:",fname);
            log_err("  Details: " + util.inspect(e));
            process.exit(1)
        }
        output = obj;
        packages = obj.dependencies;
        log("Merge with existing file:",argv.m);
        log("   existing dependencies:",packages);
    }
}

var overrides = {};
/**
 * Override file shold be of format:
 * {
 *     
 *        "devjs-globalloger": "https://github.com/WigWagCo/devjs-globallogger.git",
 *       "babel-core": "^6.14.0"
 *
 * }
 * Just like the dependencies section in package.json
 * @param  {[type]} argv.O [description]
 * @return {[type]}        [description]
 */
if(argv.O) {
    try {
        json = fs.readFileSync(argv.O, 'utf8');
    } catch(e) {
        log_err("Error reading:",argv.O);
        log_err("  Details: " + util.inspect(e));
        process.exit(1);
    }
    if(json) {
        try {
            obj = JSON.parse(json)
        } catch(e) {
            log_err("Error parsing JSON:",argv.O);
            log_err("  Details: " + util.inspect(e));
            process.exit(1)
        }
        if (typeof obj != 'object') {
            log_err("overrides file",argv.O,"has incorrect format");
            process.exit(1)            
        }
        overrides = obj;
        log("   Overrides loaded.");
    }    
}



var dirs = argv._;
for (var n=0;n<dirs.length;n++) {
    var fname = path.join(dirs[n],"devicejs.json");
    var dname = path.dirname(fname);
    var json = null;
    var obj = null;
    try {
        json = fs.readFileSync(fname, 'utf8');
    } catch(e) {
        log_err("Error reading:",fname);
        log_err("  Details: " + util.inspect(e));
    }
    if(json) {
        try {
            obj = JSON.parse(json)
        } catch(e) {
            log_err("Error parsing JSON:",fname);
            log_err("  Details: " + util.inspect(e));
        }
    }
    if(obj && obj.dependencies) {
        log("processing:",obj.name,"["+dname+"]");
        var keyz = Object.keys(obj.dependencies);
        for(var p=0;p<keyz.length;p++) {
            if(!excludes[keyz[p]]) {
                if(packages[keyz[p]] && packages[keyz[p]] != obj.dependencies[keyz[p]]) {
                    log_warn("Module",obj.name,"["+dname+"] wants version",obj.dependencies[keyz[p]],"of",keyz[p],"- conflicts with version",packages[keyz[p]],"Replacing!");
                }
                packages[keyz[p]] = obj.dependencies[keyz[p]];
                log("  ...Package",keyz[p],"-->",packages[keyz[p]]);
            } else {
                log(" DROPPING package:",keyz[p]);
            }
        }
    }
}

if (overrides && typeof overrides == 'object') {
    var keyz = Object.keys(overrides);
    for(var n=0;n<keyz.length;n++) {
        log("  OVERRIDING",keyz[n],"to",overrides[keyz[n]])
        packages[keyz[n]] = overrides[keyz[n]];
    }
}

var output = {
    name: "consolidated-packages",
    version: "0.0.1",
    description: "consolidated package",
    author: {
        name: "WigWag",
        email: "support@wigwag.com"
    },
    website: {
        url: "wigwag.com"
    },
    repository: {},
    'private': true,
    dependencies: packages
}

var ok = false;



if(!argv.m) {
    try {
        var stats = fs.statSync(outfile);
    } catch(e) {
        if(e.code == 'ENOENT') {
            ok = true;
            // ok, great
        } else {
            log_err("File system:",e);
        }
    }

    if(stats) {
        if(stats.isFile() && !argv.o) {
            log_err("File:",outfile,"exists. Overwrite it using -o or -m. Not writing",outfile);
            process.exit(1);
        } else {
            log_err("File:",outfile,"appear to not be a file but exists. Remove or change output via -o");
            process.exit(1);
        }
    }

}


if(ok) {
    var outstr = JSON.stringify(output,null,'\t');
    fs.writeFileSync(outfile,outstr,{encoding:'utf8'});        
    log("Done. Wrote",outfile);
}
//fs.writeFileSync()
