# npm-audit-wrapper

## About
This little script and command-line application provides some additional functionality to the npm audit feature that might be helpful if you try running audits against node modules/package.json files.

Note:<br/>
This project is still in early stages and not yet as flexible and customizeable as it could be. The plan was to publish this as module to the npmjs registry if the basic functionality and customability is enough to perform basic work with it.


## Requirements
NodeJS and npm have to be installed and available in order to use this app. Tested with **NodeJS v14.16.0**/**15.14.0** and **npm > v7.11.1**. As the logic in the program heavily depends on the structure of the *package.json* file and response from *npm audit* call it might not work properly with other versions and/or if the response  from *npm audit* call changes too much.


## Features
- Exclude devDependencies from audit scan and results
- Exclude dependencies containing "mycompany" in the name from audit scan and results (planned to make this configurable)
- Define minimum severity and exclude all audit findings lower than the defined minimum severity
- Exclude dependencies containing "qs" in the name from audit results (planned to make this configurable)
- Print audit result in command-line and write them to result.json file


## How it use
The command-line application assumes you have the package.json you want to audit in the same folder as the script and it is named "ex-package.json". After running the script there should be a folder called **depResults** containing one or more json files with the results and intermetidate steps (see *--cleanup* option).
The script can be run in comannd line using *node npm-audit-warpper.js SOMEOPTIONS* where SOMEOPTIONS may be replaced with the options you want to use. You can output the options using *node npm-audit-warpper.js --help*. At the moment the following functionality is available:

```
Usage: npm-audit-wrapper [options]

Performs npm audit security scan for ex-package.json file in same folder against provided registry and creates results output.

Options:
  -V, --version      output the version number
  --vb               enable verbose output
  --cleanup          cleanup files for intermetidate steps after audit
  --no-depreport     skip creating dependency report
  --excludedev       exclude devDependencies from audit
  --registry <url>   use defined registry (default: npmjs default registry https://registry.npmjs.org)
  --minserv [level]  define minimum severity for scan results (choices: "low", "moderate", "high", "critical", default: low)
  -h, --help         display help for command
```

### Cleanup and intermediate steps
To provide insight in the way of working and make it easier to debug the programm creates different files ending with the final results:
- package.json: (intermediate) The package.json file to run npm audit against. Depending on the used options and current implementation some dependencies might have been removed from this file (see --excludedev option and "mycompany" explanation above)
- package-lock.json: (intermediate) The package-lock.json file created from running npm install against package.json. This is used in npm audit to resolve the dependencies and we use this file only and avoid creating a potential big **node_modules** folder only for audit purposes.
- orgresults.json: (intermediate) The audit results from npm audit without applying "exclude from results" logic.
- results.json: (final) The final audit results. Depending on the used options and current implementation some dependencies might have been removed from this file (see --excludedev and --minserv option as well as "qs" explanation above)

When using the *--cleanup* option the intermediate files will be removed after the final results.json file has been created. 


## Example run

The *ex-package.json* file in this repository can be used as example to see how the programm behaves and how the results look like. When running *node npm-audit-warpper.js* from the root folder of this project the comand line output might look like this:

```
Running npm-audit-wrapper

Audit report:

|---hig---| axios
| via: --hig-- axios with version-range "<0.21.1" and problem: "Server-Side Request Forgery" url: https://npmjs.com/advisories/1594
| via: --mod-- axios with version-range "<0.18.1" and problem: "Denial of Service" url: https://npmjs.com/advisories/880
| Fix: update karma to version 6.3.2

|---hig---| bl
| via: --hig-- bl with version-range "<1.2.3 || >2.0.0 < 2.2.1 || >=3.0.0 <3.0.1 || >= 4.0.0 <4.0.3" and problem: "Remote Memory Exposure" url: https://npmjs.com/advisories/1555
| Fix: true

|---mod---| boom
| via: hoek
| Fix: true

|---low---| braces
| via: --low-- braces with version-range "<2.3.1" and problem: "Regular Expression Denial of Service" url: https://npmjs.com/advisories/786
| Fix: update karma to version 6.3.2

|---low---| connect
| via: --low-- connect with version-range "<=2.8.0" and problem: "methodOverride Middleware Reflected Cross-Site Scripting" url: https://npmjs.com/advisories/3
| Fix: update express to version 4.17.1

|---hig---| cryptiles
| via: --hig-- cryptiles with version-range "<4.1.2" and problem: "Insufficient Entropy" url: https://npmjs.com/advisories/1464
| via: boom
| Fix: true

|---low---| expand-braces
| via: braces
| Fix: update karma to version 6.3.2

|---hig---| express
| via: --mod-- express with version-range "<3.11 || >= 4 <4.5" and problem: "No Charset in Content-Type Header" url: https://npmjs.com/advisories/8
| via: connect
| via: mime
| via: qs
| Fix: update express to version 4.17.1

|---hig---| hawk
| via: boom
| via: cryptiles
| via: hoek
| via: sntp
| Fix: true

|---mod---| hoek
| via: --mod-- hoek with version-range "<= 4.2.0 || >= 5.0.0 < 5.0.3" and problem: "Prototype Pollution" url: https://npmjs.com/advisories/566
| Fix: true

|---mod---| karma
| via: expand-braces
| via: log4js
| via: optimist
| via: socket.io
| Fix: update karma to version 6.3.2

|---mod---| log4js
| via: axios
| Fix: update karma to version 6.3.2

|---mod---| loggly
| via: request
| via: timespan
| Fix: true

|---hig---| mailgun-js
| via: proxy-agent
| Fix: true

|---mod---| mime
| via: --mod-- mime with version-range "< 1.4.1 || > 2.0.0 < 2.0.3" and problem: "Regular Expression Denial of Service" url: https://npmjs.com/advisories/535
| Fix: update express to version 4.17.1

|---low---| minimist
| via: --low-- minimist with version-range "<0.2.1 || >=1.0.0 <1.2.3" and problem: "Prototype Pollution" url: https://npmjs.com/advisories/1179
| Fix: update karma to version 6.3.2

|---hig---| netmask
| via: --hig-- netmask with version-range "<2.0.1" and problem: "netmask npm package vulnerable to octal input data" url: https://npmjs.com/advisories/1658
| Fix: true

|---low---| optimist
| via: minimist
| Fix: update karma to version 6.3.2

|---hig---| pac-proxy-agent
| via: pac-resolver
| Fix: true

|---hig---| pac-resolver
| via: netmask
| Fix: true

|---hig---| proxy-agent
| via: pac-proxy-agent
| Fix: true

|---hig---| request
| via: bl
| via: hawk
| via: tunnel-agent
| Fix: true

|---mod---| sntp
| via: hoek
| Fix: true

|---mod---| socket.io
| via: --mod-- socket.io with version-range "<2.4.0" and problem: "Insecure Default Configuration" url: https://npmjs.com/advisories/1609
| Fix: update karma to version 6.3.2

|---low---| timespan
| via: --low-- timespan with version-range ">=0.0.0" and problem: "Regular Expression Denial of Service" url: https://npmjs.com/advisories/533
| Fix: true

|---mod---| tunnel-agent
| via: --mod-- tunnel-agent with version-range "<0.6.0" and problem: "Memory Exposure" url: https://npmjs.com/advisories/598
| Fix: true
```

## Open ToDos/Ideas

### Functional
- Provide option to define where package.json should be read from (and remove placeholder "ex-package.json" implementation)
- Make scan exclusion configurable (see "mycompany" explanation above)
- Make result exclusion configurable (see "qs" explanation above)
- Create *depResults* Folder if it does not exists
- Improve error handling for file/folder operations
- Modify scan result metadata to match exclusions

### Technical
- Add tests to project
- Add linting to project
- Maybe migrate/rewrite to Typescript
- Add github actions


## The story behind
This project was created as part of a proof of concept to evaluate if it would be possible to improve autiting node modules in a project and see if we can improve the scan and results. We were using the registry of an artifactory that did not provide the feature to run *npm audit* from the artifactory provided registry. As we had our own "mycompany" modules published in this registry it was not possible for us to run *npm audit* against the npmjs default registry as it could not resolve these "mycompany" modules. We thought an idea might be to create a wrapper around npm audit functionailty that removes these "mycompany" modules from the package.json file and performs the audit against the npmjs default registry. We were also not happy with the missing possiblity to configure what should be part of the json output of the audit result and the missing whitelist feature to remove thousands of low level security findings in deep levels of devDependencies we were waiting a fix for.
