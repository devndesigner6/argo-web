const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to check and install dependencies
function installDeps() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  let installList = [];
  if (!packageJson.dependencies['solc'] && !packageJson.devDependencies['solc']) {
    installList.push('solc@0.8.24');
  }
  if (!packageJson.dependencies['ethers']) {
    installList.push('ethers@6.13.1');
  }
  if (installList.length > 0) {
    console.log(`Installing compiler dependencies: ${installList.join(', ')}...`);
    try {
      execSync(`npm install ${installList.join(' ')}`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('Dependency installation warn:', e.message);
    }
  }
}

// Parse .env manually
function readEnv() {
  if (!fs.existsSync('.env')) return {};
  const content = fs.readFileSync('.env', 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (m) {
      let val = m[2] ? m[2].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[m[1]] = val;
    }
  });
  return env;
}

// Setup .env if missing
function setupEnv() {
  if (!fs.existsSync('.env')) {
    console.log('Creating .env file from .env.example...');
    let example = fs.readFileSync('.env.example', 'utf8');
    // Append Sepolia configs
    example += '\n\n# Ethereum Sepolia settings for iExec Hackathon\n';
    example += 'SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia\n';
    example += 'DEPLOYER_PRIVATE_KEY=your_private_key_here\n';
    fs.writeFileSync('.env', example);
  } else {
    // Append to existing .env if missing
    let content = fs.readFileSync('.env', 'utf8');
    let modified = false;
    if (!content.includes('SEPOLIA_RPC_URL')) {
      content += '\nSEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia';
      modified = true;
    }
    if (!content.includes('DEPLOYER_PRIVATE_KEY')) {
      content += '\nDEPLOYER_PRIVATE_KEY=your_private_key_here';
      modified = true;
    }
    if (modified) {
      fs.writeFileSync('.env', content);
    }
  }
}

async function main() {
  installDeps();
  setupEnv();

  const solc = require('solc');
  const { ethers } = require('ethers');

  console.log('Compiling ArgoEscrow.sol...');
  const contractPath = path.join('contracts', 'ArgoEscrow.sol');
  if (!fs.existsSync(contractPath)) {
    throw new Error('contracts/ArgoEscrow.sol not found.');
  }
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'ArgoEscrow.sol': {
        content: sourceCode
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    let hasError = false;
    output.errors.forEach(err => {
      console.log(err.formattedMessage);
      if (err.severity === 'error') hasError = true;
    });
    if (hasError) {
      throw new Error('Solidity compilation failed.');
    }
  }

  const contractOutput = output.contracts['ArgoEscrow.sol']['ArgoEscrow'];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;
  console.log('Solidity compilation succeeded!');

  const env = readEnv();
  const pk = env['DEPLOYER_PRIVATE_KEY'];
  const rpcUrl = env['SEPOLIA_RPC_URL'] || 'https://ethereum-sepolia-rpc.publicnode.com';

  if (!pk || pk === 'your_private_key_here') {
    console.log('\n============================================================');
    console.log('⚠️ DEPLOYMENT PENDING: NO PRIVATE KEY CONFIGURED.');
    console.log('============================================================');
    console.log('A .env file has been created/updated with Sepolia configs.');
    console.log('Please open your .env file and set:');
    console.log('  DEPLOYER_PRIVATE_KEY=your_sepolia_private_key');
    console.log('with a private key containing Sepolia test ETH.');
    console.log('Then, re-run this script: node scripts/compile-and-deploy.cjs');
    console.log('============================================================\n');
    return;
  }

  console.log(`Connecting to Sepolia RPC at ${rpcUrl}...`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  let wallet;
  try {
    wallet = new ethers.Wallet(pk, provider);
  } catch (e) {
    throw new Error(`Invalid private key in .env: ${e.message}`);
  }

  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);
  console.log(`Deployer address: ${address}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error('Deployer wallet has 0 ETH. Please fund it using a Sepolia faucet.');
  }

  console.log('Deploying ArgoEscrow contract...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  console.log(`Transaction broadcasted. Waiting for confirmations...`);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`\n🎉 Success! ArgoEscrow deployed to Sepolia: ${contractAddress}\n`);

  // Automatically update contract addresses in client/server code files
  console.log('Updating client & server configuration files with deployed address...');
  
  // Update src/lib/sepolia-pay.ts
  const payPath = path.join('src', 'lib', 'sepolia-pay.ts');
  if (fs.existsSync(payPath)) {
    let payCode = fs.readFileSync(payPath, 'utf8');
    payCode = payCode.replace(
      /export const ESCROW_CONTRACT_ADDRESS = "[^"]*";/,
      `export const ESCROW_CONTRACT_ADDRESS = "${contractAddress}";`
    );
    fs.writeFileSync(payPath, payCode);
    console.log(`- Updated ${payPath}`);
  }

  // Update src/lib/sepolia-verify.server.ts
  const verifyPath = path.join('src', 'lib', 'sepolia-verify.server.ts');
  if (fs.existsSync(verifyPath)) {
    let verifyCode = fs.readFileSync(verifyPath, 'utf8');
    verifyCode = verifyCode.replace(
      /const ESCROW_CONTRACT_ADDRESS = "[^"]*";/,
      `const ESCROW_CONTRACT_ADDRESS = "${contractAddress}";`
    );
    fs.writeFileSync(verifyPath, verifyCode);
    console.log(`- Updated ${verifyPath}`);
  }

  console.log('\nAll steps completed! Run "npm run dev" to launch the website.');
}

main().catch(err => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
