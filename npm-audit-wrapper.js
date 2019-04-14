#!/usr/bin/env node

const fs = require('fs');
const execSync = require('child_process').execSync;
let program = require('commander');

program
  .version('0.1.0')
  .option('--vb', 'Enable verbose output')
  .option('--cleanup', 'Cleanup files after audit')
  .option('--no-depreport', 'Skip creating dependency report')
  .option('--excludedev', 'Exclude devDependencies from audit')
  .option('--registry [url]', 'Use registry [url]', 'https://registry.npmjs.org')
  .option('--minserv [level]', 'Define minimum severity for scan results', /^(low|moderate|high|critical)$/i, 'low')
  .parse(process.argv);

// Main Code
console.log('Running npm-audit-wrapper');
initDependencies();
runNpmAudit();
excludeScanResults();

if(program.depreport) {
	createDependencyReport();
}

if(program.cleanup) {
	cleanup();
}


//Helper functions

function logIfVerbose(text) {
	if (program.vb) {
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
	  		if( checkModuleExclusionForScan(i) || (program.excludedev && depType==='devDependency') ) {
				logIfVerbose(depType + ' ' + i + ' should be excluded from scan');
				delete depObject[i];
			}
	  	}
	}
}

function checkModuleExclusionForScan(moduleName) {
	//return false;
	return moduleName.indexOf('lottoland') > -1;
}

function runNpmAudit() {
	logIfVerbose('Creating package-lock.json and executing npm audit with registry ' + program.registry);
	let scanResult = execSync('cd depresults && npm install --package-lock-only >nul 2>&1 && npm audit --json --registry=' + program.registry + ' || exit 0');
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
	
	if (packageFile.advisories) {
		let moduleName;
		let severity;
	  	for (var key in packageFile.advisories) {
	  		moduleName = packageFile.advisories[key].module_name;
	  		severity = packageFile.advisories[key].severity; 
	  		logIfVerbose('Found entry number ' + key + ' with severity "' + severity + '" with moduleName "' + moduleName + '"');
	  		if(checkModuleExclusionForAudit(moduleName) || ( getSeverityLevel(severity) < getSeverityLevel(program.minserv))  ) {
				logIfVerbose(moduleName + ' should be excluded from results');
				delete packageFile.advisories[key];
			}
	  	}
	}
	return packageFile;
}

function checkModuleExclusionForAudit(moduleName) {
	return false;
	//return moduleName.indexOf('qs') > -1;
}

function createDependencyReport() {
	let rawData=readFile('depResults/results.json');
	createDependencyReportFromResultFile(rawData);
}

function createDependencyReportFromResultFile(data) {
	let packageFile = JSON.parse(data);
	logIfVerbose('Create Dependency Check Result');
	
	if (packageFile.advisories) {
		let vulEntry;
		let reportOutput='';
	  	for (var key in packageFile.advisories) {
	  		vulEntry = packageFile.advisories[key];
	  	
	  		if (vulEntry.severity) {
	  			reportOutput+= '|-----' +  vulEntry.severity + '-----| ';
	  		}
	  		
	  		if (vulEntry.title) {
	  			reportOutput+= vulEntry.title + '\r\n';
	  		}
	  		
	  		if (vulEntry.module_name) {
	  			reportOutput+= '| ' + vulEntry.module_name;
	  		}
	  		
	  		let findings;
	  		if (vulEntry.findings[0]) {
	  			findings = vulEntry.findings[0];
	 			reportOutput+= findings.dev ? ' [DEV] in\r\n' : ' [PROD] in\r\n';
	 			if (findings.paths) {
	 				for (var pathEntry in findings.paths) {
	 					reportOutput+= '- ' + findings.paths[pathEntry] + '\r\n';
	 				}
	 			}
	  		}
	  		
	  		if (vulEntry.recommendation) {
	  			reportOutput+= '| Rec.: ' + vulEntry.recommendation;
	  		}
	  		reportOutput+= '\r\n\r\n';
	  		
	  	}
	  	console.log('\r\nAudit report:\r\n\r\n' + reportOutput);	  	
	}
}

function cleanup() {
	console.log('Running cleanup');
	deleteFile('depResults/package.json');
	deleteFile('depResults/package-lock.json');
	deleteFile('depResults/orgresults.json');
	console.log('Cleanup finished');
}
