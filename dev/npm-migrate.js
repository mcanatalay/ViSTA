var path = {
    input: "node_modules",
    output: "WWW/dependencies"
};

var migrateModules = [
    "jquery",
    "materialize-css",
    "vis",
    "html2canvas"
];

var showMessage = function(name, err){
    if(err){
        return "- " + name + " Module couldn't migrated!";
    } else{
        return "+ " + name + " Module successfully migrated!";
    }
};

var copydir = require('copy-dir');

migrateModules.forEach(function(module){
    console.log("> " + module + " Module started to migration process!");
    copydir(
            path.input+"/"+module+"/dist",
            path.output+"/"+module,
            function(err){
                console.log(showMessage(module,err));
            }
    );
});