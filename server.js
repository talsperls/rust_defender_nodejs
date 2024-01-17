const express = require('express');
const app = express();
const fs = require('fs');
const { promisify } = require('util');
const { exec, execSync } = require('child_process');
const axios = require('axios');



const port = 80;



const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);


async function getRepositoryUrl(cargoTreeJson) {
    let urls = [];
    try {
        
        const keys = Object.keys(cargoTreeJson);

        for (const key of keys) {
            const value = cargoTreeJson[key];
            try{
                const response = await axios.get(`https://crates.io/api/v1/crates/${value.packageName}`);
                if (response.status === 200) {
                    const crateData = response.data.crate;
                    
                    // Check if the crate data and repository field exist
                    if (crateData && crateData.repository) {
                      const repositoryUrl = crateData.repository;
                      console.log(`Repository URL for ${value.packageName}: ${repositoryUrl}`);
                      urls.push(repositoryUrl)
                      
                    } else {
                      console.error(`Repository information not found for ${value.packageName}`);
                    }
                  } else {
                    console.error(`Failed to retrieve data for ${value.packageName}. Status code: ${response.status}`);
                  }
            }
            catch(err){
                console.log(err)
            }
            
      
      // Check if the request was successful
      
            
        }
        
        return urls;


      
    } catch (error) {
      console.error(`Error while fetching data: ${error.message}`);
     
    }

    
  }



const addAllDependancies = async (cargoTreeJson) => {
    const filePath = 'Cargo.toml';
    const substringToFind = '[dependencies]';
    //const textToAdd = `${name} = "${version}"`;
  
    try {
      let data = await readFileAsync(filePath, 'utf8');
  
      // Find the position of the substring
      const index = data.indexOf(substringToFind);
      
      const keys = Object.keys(cargoTreeJson);

      const endOfDependenciesIndex = data.indexOf('[', index + substringToFind.length);
      const startOfText = data.slice(0, endOfDependenciesIndex)
      const restOfText = data.slice(endOfDependenciesIndex);
      var textToAdd = "";

      for (const key of keys) {
        const value = cargoTreeJson[key];
        
        if (value.packageName === undefined || value.packageName === null || value.packageName === "") {
            
        }
        else{
            
            textToAdd = textToAdd + `${value.packageName} = "${value.packageVersion}"\n`;

        }   
      }

      if (index !== -1) {
                

        const updatedContent = startOfText + '\n' + textToAdd + '\n' + restOfText;
        await writeFileAsync(filePath, updatedContent, 'utf8');
        console.log('Text added successfully.');
        return true;
     } 
     else {
        console.log('Substring not found in the file.');
        return false;
      }
     
    } catch (err) {
      console.error(err);
      return false;
    }
  };



const addDependancies = async (name, version) => {
    const filePath = 'Cargo.toml';
    const substringToFind = '[dependencies]';
    const textToAdd = `${name} = "${version}"`;
  
    try {
      let data = await readFileAsync(filePath, 'utf8');
  
      // Find the position of the substring
      const index = data.indexOf(substringToFind);
  
      // If the substring is found, remove everything under it
      if (index !== -1) {
        const endOfDependenciesIndex = data.indexOf('[', index + substringToFind.length);
        const updatedContent = data.slice(0, index + substringToFind.length) + '\n' + textToAdd + (endOfDependenciesIndex !== -1 ? data.slice(endOfDependenciesIndex) : '');
  
        // Write the updated content back to the file
        await writeFileAsync(filePath, updatedContent, 'utf8');
        console.log('Text added successfully.');
        return true;
      } else {
        console.log('Substring not found in the file.');
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };


  const runCommand = (command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error}`);
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  };

  function getCargoTreeJson() {
    try {
      // Run 'cargo tree' command and capture the output
      const cargoTreeOutput = execSync('cargo tree', { encoding: 'utf-8' });
  
      // Split the output into lines
      const lines = cargoTreeOutput.split('\n');
  
      // Initialize an array to store package information
      const packages = [];
  
      // Loop through the lines starting from the second line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
  
        // Skip empty lines ' || line.includes('└') || line.includes('─')
        if (line === '') {
          continue;
        }
  
        // Extract package name and version from each line
       // const [packageName, packageVersion] = line.split(' ');
        let packageName = "";
        let packageVersion = "";
        let foundPackage = false;
        const splitLine = line.split(' ');

        const letterRegex = /[a-zA-Z]/;
        const numericRegex = /^v\d+\.\d+\.\d+$/;
        for (const element of splitLine){
            const res =  letterRegex.test(element);
            if(res && !foundPackage && element.charAt(0) !== "["){
                packageName = element;
                foundPackage = true;
            }

            if(element.charAt(0) === 'v'){
                const res2 = numericRegex.test(element);
                console.log(res2)
                console.log(element)
                if(res2){
                    packageVersion = element.slice(1);
                }
            }
        }
  
        // Add the package information to the array
        packages.push({
          packageName,
          packageVersion
        });
      }
  
      return packages;
    } catch (error) {
      console.error('Error running cargo tree:', error.message);
      return null;
    }
  }
  

// Define a route
app.get('/:name/:version', (req, res) => {
  const name = req.params.name;
  const version = req.params.version;

  (async () => {
    const addDepResult = await addDependancies(name, version);
    console.log(addDepResult);
    console.log("running cargo build")
    const runBuildResult = await runCommand('cargo build');
    console.log(runBuildResult);
    console.log("DONE")

    console.log("Running cargo tree")
    const cargoTreeJson = getCargoTreeJson();

    if (cargoTreeJson) {
    console.log('Cargo Tree JSON:', cargoTreeJson);
    // Save the JSON to a file or use it as needed
    } else {
    console.log('Failed to get Cargo Tree JSON.');
    }
    console.log("DONE")

    var addAllDepResult = await addAllDependancies(cargoTreeJson);
    addAllDepResult = await addAllDependancies("name", "0.1.2");
    console.log(addAllDepResult)

    console.log("running audit")
    const runAuditResult = await runCommand('cargo audit');
    var stdoutString = runAuditResult.stdout.toString();
    try{
        if (stdoutString.includes("Title")){
            res.json({result: 'Failed'});
        }
        else{
           // const runTreeResult = await runCommand('cargo tree');
           // stdoutString = runTreeResult.stdout.toString();
           // console.log(stdoutString)
            const urls = await getRepositoryUrl(cargoTreeJson);
           
            res.json({result: urls});
        }
    }
    catch(e){
        console.log("Failed")
        console.log(e)
    }
    
    console.log("DONE")


   

  })();


  


  
    
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
