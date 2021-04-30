#!/usr/bin/env node

const fs = require('fs');
const execSync = require('child_process').execSync;
let program = require('commander');

program
  .version('0.2.0')
  .description('Performs npm audit security scan for ex-package.json file in same folder against provided registry and creates results output.')
  .option('--vb', 'enable verbose output')
  .option('--cleanup', 'cleanup files for intermetidate steps after audit')
  .option('--no-depreport', 'skip creating dependency report')
  .option('--excludedev', 'exclude devDependencies from audit')
  .addOption(new program.Option('--registry <url>', 'use defined registry').default('https://registry.npmjs.org', 'npmjs default registry https://registry.npmjs.org'))
  .addOption(new program.Option('--minserv [level]', 'define minimum severity for scan results').default('low', 'low').choices(['low', 'moderate', 'high', 'critical'])) 
  .parse(process.argv);

// Main Code
console.log('Running npm-audit-wrapper');
let options = program.opts();
initDependencies();
runNpmAudit();
excludeScanResults();

if(options.depreport) {
	createDependencyReport();
}

if(options.cleanup) {
	cleanup();
}


//Helper functions

function logIfVerbose(text) {
	if (options.vb) {
		console.log(text);
	}
}

function getSeverityLevel(sevString) {
	switch(sevString) {
		case 'critical':
	        return 4;
	    case 'high':
	        return 3;
	    case 'moderate':
	        return 2;
	 	case 'low':
	 	default:
	        return 1;	
	}
}

function readFile(filename) {
	logIfVerbose('Reading ' + filename);
	let rawData=fs.readFileSync(filename);
	logIfVerbose('Sucessfully read ' + filename);
	return rawData;
}

function writeFile(filename, data) {
	logIfVerbose('Write ' + filename);
	fs.writeFileSync(filename, data);  
	logIfVerbose('Sucessfully written ' + filename);	
}

function deleteFile(filename) {
	logIfVerbose('Deleting ' + filename);
	fs.unlinkSync(filename)
	logIfVerbose('Sucessfully deleted ' + filename);
} 

//Sub program functions

function initDependencies() {
	logIfVerbose('Copying package.json file to depResults/package.json');
	fs.copyFileSync('ex-package.json', 'depResults/package.json');
	logIfVerbose('ex-package.json was copied to depResults/package.json');
	
	let rawData=readFile('depResults/package.json');
	
	logIfVerbose('Excluding dependencies');
	let cleanedPackageFile=excludeDepsFromScan(rawData);
	let cleanedPackageFileJson = JSON.stringify(cleanedPackageFile);	
	writeFile('depResults/package.json', cleanedPackageFileJson);	
}

function excludeDepsFromScan(data) {
	let packageFile = JSON.parse(data);
	logIfVerbose('Checking dependencies for scan exclusions');
	removeFromScan(packageFile.dependencies, 'dependency');
	removeFromScan(packageFile.devDependencies, 'devDependency');
	return packageFile;
}

function removeFromScan(depObject, depType) {
	if (depObject) {
	  	for (var i in depObject) { 
	  		logIfVerbose('Found ' + depType + ' ' + i);
	  		if( checkModuleExclusionForScan(i) || (options.excludedev && depType==='devDependency') ) {
				logIfVerbose(depType + ' ' + i + ' should be excluded from scan');
				delete depObject[i];
			}
	  	}
	}
}

function checkModuleExclusionForScan(moduleName) {
	//return false;
	return moduleName.indexOf('mycompany') > -1;
}

function runNpmAudit() {
	logIfVerbose('Creating package-lock.json and executing npm audit with registry ' + options.registry);
	let scanResult = execSync('cd depresults && npm install --package-lock-only >nul 2>&1 && npm audit --json --registry=' + options.registry + ' || exit 0');
	writeFile('depResults/orgresults.json', scanResult);
}

function excludeScanResults() {
	let rawData=readFile('depResults/orgresults.json');
	logIfVerbose('Excluding scan results');
	let cleanedPackageFile=excludeScanResultsFromResultFile(rawData);
	let cleanedPackageFileJson = JSON.stringify(cleanedPackageFile);
	writeFile('depResults/results.json', cleanedPackageFileJson);	
}

function excludeScanResultsFromResultFile(data) {
	let packageFile = JSON.parse(data);
	logIfVerbose('Checking for result exclusions');
	
	if (packageFile.vulnerabilities) {
		let moduleName;
		let severity;
	  	for (var key in packageFile.vulnerabilities) {
	  		moduleName = packageFile.vulnerabilities[key].name;
	  		severity = packageFile.vulnerabilities[key].severity; 
	  		logIfVerbose('Found entry number ' + key + ' with severity "' + severity + '" with moduleName "' + moduleName + '"');
	  		if(checkModuleExclusionForAudit(moduleName) || ( getSeverityLevel(severity) < getSeverityLevel(options.minserv))  ) {
				logIfVerbose(moduleName + ' should be excluded from results');
				delete packageFile.vulnerabilities[key];
			}
	  	}
	}
	return packageFile;
}

function checkModuleExclusionForAudit(moduleName) {
	// return false;
	return moduleName.indexOf('qs') > -1;
}

function createDependencyReport() {
	let rawData=readFile('depResults/results.json');
	createDependencyReportFromResultFile(rawData);
}

function createDependencyReportFromResultFile(data) {
	let packageFile = JSON.parse(data);
	logIfVerbose('Create Dependency Check Result');
	
	if (packageFile.vulnerabilities) {
		let vulEntry;
		let reportOutput='';
	  	for (var key in packageFile.vulnerabilities) {
	  		vulEntry = packageFile.vulnerabilities[key];
	  	
	  		if (vulEntry.severity) {
	  			reportOutput+= '|---' +  createSeverityLabel(vulEntry.severity) + '---| ';
	  		}
	  		
	  		if (vulEntry.name) {
	  			reportOutput+= vulEntry.name + '\r\n';
	  		}

			for (var viaEntry of vulEntry.via) {
				reportOutput+= '| via: ' + createViaEntryLog(viaEntry) + '\r\n';
			}
	  		
	  		if (vulEntry.title) {
	  			reportOutput+= '| ' + vulEntry.title;
	  		}
	  		
	  		if (vulEntry.fixAvailable) {
	  			reportOutput+= '| Fix: ' + createFixEntry(vulEntry.fixAvailable);
	  		}
	  		reportOutput+= '\r\n\r\n';
	  		
	  	}
	  	console.log('\r\nAudit report:\r\n\r\n' + reportOutput);	  	
	}
}

function createSeverityLabel(severity) {
	if (severity) {
		return severity.substring(0, 3);
	} else return '';
}

function createViaEntryLog(viaEntry) {
	if (typeof(viaEntry) === 'string' || typeof(viaEntry[0]) === 'string')  {
		return viaEntry;
	} else {
		return '--' + createSeverityLabel(viaEntry.severity) + '-- ' + viaEntry.dependency + ' with version-range "' +  viaEntry.range + '" and problem: "' + viaEntry.title + '" url: ' + viaEntry.url;
	}
}

function createFixEntry(fixEntry) {
	if (typeof(fixEntry) === 'boolean') {
		return fixEntry;
	} else {
		return 'update ' + fixEntry.name + ' to version ' + fixEntry.version;
	}
}

function cleanup() {
	console.log('Running cleanup');
	deleteFile('depResults/package.json');
	deleteFile('depResults/package-lock.json');
	deleteFile('depResults/orgresults.json');
	console.log('Cleanup finished');
}
