// Import everything
import { ethers } from "ethers";

import PriceFeedArtifact from "./artifacts/contracts/PriceFeed.sol/PriceFeed.json"; // Adjust the path as necessary
  //likely same
import TroveManagerArtifact from "./TroveManager.json"; // Adjust the path as necessary
import HintHelpersArtifact from "./HintHelpers.json"; // Adjust the path as necessary
import SortedTrovesArtifact from "./SortedTroves.json"; // Adjust the path as necessary
import DebtTokenArtifact from "./artifacts/contracts/DebtToken.sol/DebtToken.json";

// Declare provider and signer globally
let provider: ethers.BrowserProvider;
let signer: ethers.Signer;

async function initialize() {
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  updatethUSDBalance();
}

async function updatethUSDBalance() {
  const balanceElement = document.getElementById("thUSDBalance");
  if (!balanceElement) return;

  balanceElement.textContent = "";
  const balance = await fetchthUSDBalance();
  const formattedBalance = parseFloat(balance).toFixed(4); // Limit to 4 decimals
  balanceElement.textContent = `${formattedBalance} thUSD`;
}

// See https://docs.gravitaprotocol.com/gravita-docs/about-gravita-protocol/smart-contracts
// for contract addresses on diff chains. 
  
const networks = {
  eth: {
    chainId: 1, // Ethereum chainId in hex
    chainName: "Ethereum Mainnet",
    rpcUrl: "wss://ethereum-rpc.publicnode.com", // Optional, mainly handled by Rabby
    availableCollaterals: {
      // weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      tbtc: "0x18084fbA666a33d37592fA2633fD49a74DD93a88",
    },
    thUSDAddress: "0xCFC5bD99915aAa815401C5a41A927aB7a38d29cf", // thUSD on Ethereum
    troveManagerAddress: "0xfC7d41A684b7dB7c817A9dDd028f9A31c2F6f893",
    hintHelpersAddress: "0x2249e86a4b99eccc081600c11b2b30ff64202f55", //Found!
    SortedTrovesAddress: "0xA5626CBA9A4448019e73CE59784bD22736986711",
    priceFeedAddress: "0x83aE3931C5D03773755311372c0737F856657a43",
  },
  optimism: {
    chainId: 10, // Optimism chainId in hex (10 in decimal) 
    chainName: "Optimism",
    rpcUrl: "https://mainnet.optimism.io", // Optional
    availableCollaterals: {
      weth: "0x4200000000000000000000000000000000000006",
      wsteth: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
      wbtc: "0x68f180fcce6836688e9084f035309e29bf0a2095",
    },
    thUSDAddress: "0xc5b001dc33727f8f26880b184090d3e252470d45", // thUSD on OP
    troveManagerAddress: "0x75c72f459f2054b46cefd6d10ec99d0fbd777f05", //yes
    hintHelpersAddress: "0xa253c8b11fc03ea74710cf668d86fd9fdbf8e550", //REAL VMO FROM REDEEM TX
    SortedTrovesAddress: "0xe36e5aa08756074d7e12d6a753b5ed2c54aea573", //yes
    priceFeedAddress: "0xadd6F326a395629926D9a535d809B5e3d8c7FE8d", // from tx 
  },
  //   optimism: {
  //   chainId: 10, // Optimism chainId in hex (10 in decimal) 
  //   chainName: "Optimism",
  //   rpcUrl: "https://mainnet.optimism.io", // Optional
  //   availableCollaterals: {
  //     wbtc: "0x68f180fcce6836688e9084f035309e29bf0a2095",
  //   },
  //   thUSDAddress: "0xc5b001dc33727f8f26880b184090d3e252470d45", // thUSD on OP
  //   troveManagerAddress: "0xd584A5E956106DB2fE74d56A0B14a9d64BE8DC93", //yes
  //   hintHelpersAddress: "0xbeb31b7ab58e1f38b9a99406571c2cd69a23cf41", //REAL VMO FROM REDEEM TX
  //   SortedTrovesAddress: "0x09B841517E6A0adA7E53DDF4d8837860f6F9E91d", //yes
  //   priceFeedAddress: "0xC6b3Eea38Cbe0123202650fB49c59ec41a406427", // from tx 
  // },
  linea: {
    chainId: 59144, // Linea Mainnet chainId in hex (59144 in decimal)
    chainName: "Linea Mainnet",
    rpcUrl: "https://rpc.linea.build", // Optional
    availableCollaterals: {
      weth: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
      wsteth: "0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F",
      weeth: "0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6",
    },
    thUSDAddress: "0x894134a25a5faC1c2C26F1d8fBf05111a3CB9487", 
    troveManagerAddress: "0xdC44093198ee130f92DeFed22791aa8d8df7fBfA",
    hintHelpersAddress: "0x53525a62e55B6002792B993a2C27Af70d12443e4",
    SortedTrovesAddress: "0xF0e0915D233C616CB727E0b2Ca29ff0cbD51B66A",
    priceFeedAddress: "0xAD1B9867BEFD148c9476B9Dd1e7C749bFcefbB2e",
  },
};

// Create chainId-to-networkKey mapping
const chainIdToNetworkKey = Object.entries(networks).reduce(
  (acc, [key, { chainId }]) => ({ ...acc, [chainId]: key }),
  {}
);

async function switchNetwork(chainId: string) {
  await initialize();
  if (!window.ethereum) {
    alert("Rabby Wallet or another compatible wallet is required.");
    return;
  }

  try {
    // Ask the wallet to switch to the specified network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });

    console.log(`Switched to network with chainId: ${chainId}`);
  } catch (error: any) {
    if (error.code === 4902) {
      // If the network is not added, attempt to add it
      const network = Object.values(networks).find((net) => net.chainId === chainId);
      if (network) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: network.chainId,
              chainName: network.chainName,
              rpcUrls: [network.rpcUrl],
            },
          ],
        });
      }
    } else {
      console.error("Failed to switch network:", error);
    }
  }

  updatethUSDBalance();
}

document.querySelectorAll('input[name="network"]').forEach((radio) => {
  radio.addEventListener("change", async (event) => {
    const form = document.getElementById("networkForm") as HTMLFormElement;
    const formData = new FormData(form);
    const selectedNetwork = formData.get("network") as string;
  
    if (selectedNetwork && networks[selectedNetwork]) {
      switchNetwork(networks[selectedNetwork].chainId);
    } else {
      alert("Invalid network selection");
    }

    //[!] This is now a repeated code block
    /*
    const form2 = document.getElementById("collateralForm") as HTMLFormElement;
    const formData2 = new FormData(form2);
    const collateral = formData2.get("collateral") as string;   
  
    const collateralAddress = networks[selectedNetwork].availableCollaterals[collateral];

    const thUSDAmount = (document.getElementById("thUSDAmount") as HTMLInputElement).value; // Get thUSD amount from input

    await getQuote(collateralAddress, thUSDAmount);
    */
    //[!] This is now a repeated code block

    //Clear Quote on Network switch
    const quoteResult = document.getElementById("quoteResult") as HTMLElement;
    quoteResult.textContent = "...";
  });
});

//Re-run quote as soon as collateral is switched
document.querySelectorAll('input[name="collateral"]').forEach((radio) => {
  radio.addEventListener("change", async (event) => {
    const thUSDAmount = (document.getElementById("thUSDAmount") as HTMLInputElement).value; // Get thUSD amount from input
    if (!thUSDAmount) {
      return;
    }

    await getQuote(thUSDAmount);
  });
});

// Determine the network and fetch the balance using the appropriate thUSD address
async function fetchthUSDBalance(): Promise<string> {
  try {
    const network = await provider.getNetwork();
    const thUSDAddress = networks[chainIdToNetworkKey[Number(network.chainId)]].thUSDAddress;

    if (!thUSDAddress) {
      throw new Error(`thUSD contract not available for chain ID ${network.chainId}`);
    }

    const thUSDContract = new ethers.Contract(thUSDAddress, DebtTokenArtifact.abi, signer);
    const balance = await thUSDContract.balanceOf(await signer.getAddress());

    return ethers.formatUnits(balance, 18); // Assume thUSD has 18 decimals
  } catch (error) {
    console.error("Error fetching thUSD balance:", error);
    return "0";
  }
}

// Handle MAX button click
document.getElementById("maxthUSD")?.addEventListener("click", async () => {
  await initialize(); // Initialize provider and signer when button is clicked

  try {
    const maxBalance = await fetchthUSDBalance();
    (document.getElementById("thUSDAmount") as HTMLInputElement).value = maxBalance;
  } catch (error) {
    console.error("Error setting MAX thUSD:", error);
  }
});

// Removed collateralAddress as an argument from getQuote and adjusted its logic to derive collateralAddress internally.
async function getQuote(thUSDAmount: string) {
  const quoteResult = document.getElementById("quoteResult") as HTMLElement;
  quoteResult.textContent = "...";

  const network = await provider.getNetwork();
  const currentNetworkName = chainIdToNetworkKey[Number(network.chainId)];

  const form = document.getElementById("collateralForm") as HTMLFormElement;
  const formData = new FormData(form);
  const collateral = formData.get("collateral") as string;

  const collateralAddress = networks[currentNetworkName].availableCollaterals[collateral];

  const troveManager = new ethers.Contract(networks[currentNetworkName].troveManagerAddress, TroveManagerArtifact.abi, signer);
  const hintHelpers = new ethers.Contract(networks[currentNetworkName].hintHelpersAddress, HintHelpersArtifact.abi, signer);

  try {
    const thUSDAmountInWei = ethers.parseUnits(thUSDAmount, 18); // Convert thUSD amount to wei
    const softeningFloat = 1; // Placeholder value, replace with actual logic to fetch softening parameter

    const redemptionRateWithDecay = await troveManager.getRedemptionRateWithDecay();
    const rateFloat = Number(redemptionRateWithDecay) / Number(1e18);

    const entireSystemDebt = await troveManager.getEntireSystemDebt();

    const feeRateForAmount = rateFloat + 0.5 * (Number(thUSDAmountInWei) / Number(entireSystemDebt));
    const quote = Number(thUSDAmount) * (1 * softeningFloat - feeRateForAmount);

    quoteResult.textContent = quote.toFixed(4) + " USD";
  } catch (error) {
    console.error("Error fetching quote:", error);
    quoteResult.textContent = "Error calculating quote.";
  }
}

// Updated all calls to getQuote to remove collateralAddress as an argument.
document.querySelectorAll('input[name="collateral"]').forEach((radio) => {
  radio.addEventListener("change", async (event) => {
    const thUSDAmount = (document.getElementById("thUSDAmount") as HTMLInputElement).value; // Get thUSD amount from input
    if (!thUSDAmount) {
      return;
    }

    await getQuote(thUSDAmount);
  });
});

// Event listener for the "QUOTE" button
document.getElementById("quote")?.addEventListener("click", async () => {
  const thUSDAmount = (document.getElementById("thUSDAmount") as HTMLInputElement).value;
  if (!thUSDAmount) {
    alert("Please enter the thUSD amount.");
    return;
  }

  await getQuote(thUSDAmount);
});

// Wait for the DOM to be ready
document.getElementById("sendTx")?.addEventListener("click", async () => {
  //do net switch here too? 
  const form = document.getElementById("networkForm") as HTMLFormElement;
  const formData = new FormData(form);
  const selectedNetwork = formData.get("network") as string;

  if (selectedNetwork && networks[selectedNetwork]) {
    switchNetwork(networks[selectedNetwork].chainId);
  } else {
    alert("Invalid network selection");
  }

  try {
    let signer = null;

    let provider;
    if (window.ethereum == null) {
    
        // If MetaMask is not installed, we use the default provider,
        // which is backed by a variety of third-party services (such
        // as INFURA). They do not have private keys installed,
        // so they only have read-only access
        console.log("MetaMask not installed; using read-only defaults")
        provider = ethers.getDefaultProvider()
    
    } else {
    
        // Connect to the MetaMask EIP-1193 object. This is a standard
        // protocol that allows Ethers access to make all read-only
        // requests through MetaMask.
        provider = new ethers.BrowserProvider(window.ethereum)
    
        // It also provides an opportunity to request access to write
        // operations, which will be performed by the private key
        // that MetaMask manages for the user.
        signer = await provider.getSigner();
    }


    //const chainIdHex = await network.provider.send('eth_chainId');
    const network = await provider.getNetwork();
    const currentNetworkName = chainIdToNetworkKey[Number(network.chainId)];
    const thUSDAddress = networks[currentNetworkName].thUSDAddress;

    if (!thUSDAddress) {
      console.error(`thUSD contract not available for chain ID ${network.chainId}`);
      return;
    }

    // Get user-specified thUSD amount
    const thUSDAmountInput = document.getElementById("thUSDAmount") as HTMLInputElement;
    const thUSDAmount = ethers.parseUnits(thUSDAmountInput.value || "0", 18);

    if (thUSDAmount <= 0n) {
      console.error("Invalid thUSD amount");
      return;
    }
    
    // See https://docs.gravitaprotocol.com/gravita-docs/about-gravita-protocol/smart-contracts
    // for contract addresses on diff chains. 
    
    let collateralAddress: string;
          
    // Set the amount of thUSD to redeem
    const LUSDAmount = thUSDAmount;
    
    const form = document.getElementById("collateralForm") as HTMLFormElement;
    const formData = new FormData(form);
    const collateral = formData.get("collateral") as string;    
    
      const PriceFeed = new ethers.Contract(networks[currentNetworkName].priceFeedAddress, PriceFeedArtifact.abi, signer)
      const troveManager = new ethers.Contract(networks[currentNetworkName].troveManagerAddress, TroveManagerArtifact.abi, signer);
      const hintHelpers = new ethers.Contract(networks[currentNetworkName].hintHelpersAddress, HintHelpersArtifact.abi, signer);
      const SortedTroves = new ethers.Contract(networks[currentNetworkName].SortedTrovesAddress, SortedTrovesArtifact.abi, signer);
    
      collateralAddress = networks[currentNetworkName].availableCollaterals[collateral];

      var price = await PriceFeed.fetchPrice();
      console.log(collateral, " Price: ", price);

      console.log(collateral, " LUSDAmount: ", LUSDAmount);

    
       // Get the redemptions hints from the deployed HintHelpers contract
        var redemptionhint = await hintHelpers.getRedemptionHints(LUSDAmount, price, 50)
        console.log("Redemption hint: ", redemptionhint);
        var { 0: firstRedemptionHint, 1: partialRedemptionNewICR, 2: truncatedLUSDAmount } = redemptionhint

        console.log("partialRedemptionNewICR: ", partialRedemptionNewICR);
      
        const numTroves = await SortedTroves.getSize()
        console.log("numTroves: ", numTroves);
        //const numTrials = numTroves.mul('15');
        const numTrials = numTroves * 15n;
        console.log("numTrials: ", numTrials);
        
        // Get the approximate partial redemption hint
        const { hintAddress: approxPartialRedemptionHint } = await hintHelpers.getApproxHint(partialRedemptionNewICR, numTrials, 42)
        
        console.log("HintAddress: ", approxPartialRedemptionHint);
    
        
        /* Use the approximate partial redemption hint to get the exact partial redemption hint from the 
        * deployed SortedTroves contract
        */
        const exactPartialRedemptionHint = (await SortedTroves.findInsertPosition(partialRedemptionNewICR,
          approxPartialRedemptionHint,
          approxPartialRedemptionHint))
      
        const maxFee = ethers.parseEther("1.0")
    
        /* Finally, perform the on-chain redemption, passing the truncated LUSD amount, the correct hints, and the expected
        * ICR of the final partially redeemed trove in the sequence. 
        */
    
        console.log(
          truncatedLUSDAmount,
          firstRedemptionHint,
          exactPartialRedemptionHint[0],
          exactPartialRedemptionHint[1],
          partialRedemptionNewICR,
          0, maxFee)
    
          
    
          
        const tx = await troveManager.redeemCollateral(
            truncatedLUSDAmount,
            firstRedemptionHint,
            exactPartialRedemptionHint[0],
            exactPartialRedemptionHint[1],
            partialRedemptionNewICR,
            0, maxFee,
            { gasLimit: 978068, gasPrice: 39200000  }
          )
        
    
    
      console.log("All tx completed successfully!");    
    
    // Often you may wish to wait until the transaction is mined
    const receipt = await tx.wait();

  } catch (error) {
    console.error("Error:", error);
  }
});

async function initializeNetworkSwitcher() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId); // Fix here


  const selectedNetworkKey = Object.keys(networks).find(
    (key) => networks[key].chainId === chainId
  );

  if (selectedNetworkKey) {
    updateCollateralOptions(selectedNetworkKey);

    const radioButton = document.querySelector(
      `input[name="network"][value="${selectedNetworkKey}"]`
    ) as HTMLInputElement;
    if (radioButton) radioButton.checked = true;
  } else {
    console.warn("Unknown network detected");
  }
}

function updateCollateralOptions(networkKey: string) {
  const availableCollaterals = Object.keys(networks[networkKey].availableCollaterals);
  const allCollaterals = document.querySelectorAll<HTMLInputElement>(
    'input[name="collateral"]'
  );

  allCollaterals.forEach((input) => {
    const parentLabel = input.closest(".radio-button");
    if (parentLabel) {
      if (availableCollaterals.includes(input.value)) {
        parentLabel.style.display = "inline-block"; // Show available collaterals
      } else {
        parentLabel.style.display = "none"; // Hide unavailable collaterals
      }
    }
  });
  //updatethUSDBalance();
}

// Reinitialize collaterals on network change
window.ethereum.on("chainChanged", () => {
  initializeNetworkSwitcher();
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const quoteResult = document.getElementById("quoteResult") as HTMLElement;
  quoteResult.textContent = "Enter amount for quote";
  initialize();
  initializeNetworkSwitcher();
});