// Import everything
import { ethers } from "ethers";

// Import just a few select items
import { BrowserProvider, parseUnits } from "ethers";

// Import from a specific export
import { HDNodeWallet } from "ethers/wallet";

import { BigNumberish } from "ethers";

import PriceFeedArtifact from "./artifacts/contracts/PriceFeed.sol/PriceFeed.json"; // Adjust the path as necessary
//import PriceFeedL2Artifact from "./artifacts/contracts/Pricing/PriceFeedL2.sol/PriceFeedL2.json"; // Adjust the path as necessary
import VesselManagerArtifact from "./artifacts/contracts/VesselManager.sol/VesselManager.json"; // Adjust the path as necessary
import VesselManagerOperationsArtifact from "./artifacts/contracts/VesselManagerOperations.sol/VesselManagerOperations.json"; // Adjust the path as necessary
import SortedVesselsArtifact from "./artifacts/contracts/SortedVessels.sol/SortedVessels.json"; // Adjust the path as necessary
import DebtTokenArtifact from "./artifacts/contracts/DebtToken.sol/DebtToken.json";

// Declare provider and signer globally
let provider: ethers.BrowserProvider;
let signer: ethers.Signer;

async function initialize() {
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  updateGRAIBalance();
}

async function updateGRAIBalance() {
  const balanceElement = document.getElementById("graiBalance");
  if (!balanceElement) return;

  balanceElement.textContent = "Loading...";
  const balance = await fetchGRAIBalance();
  const formattedBalance = parseFloat(balance).toFixed(4); // Limit to 4 decimals
  balanceElement.textContent = `${formattedBalance} GRAI`;
}

const networks = {
  eth: {
    chainId: "0x1", // Arbitrum One chainId in hex (42161 in decimal)
    chainName: "Ethereum Mainnet",
    rpcUrl: "wss://ethereum-rpc.publicnode.com", // Optional, mainly handled by Rabby
    availableCollaterals: ["weth", "wsteth", "weeth", "reth", "sweth"], // Collaterals for Mainnet
  },
  arbitrum: {
    chainId: "0xa4b1", // Arbitrum One chainId in hex (42161 in decimal)
    chainName: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc", // Optional, mainly handled by Rabby
    availableCollaterals: ["weth", "wsteth", "weeth", "reth", "sfrxeth"], // Collaterals for Arbitrum
  },
  zksync: {
    chainId: "0x144", // zkSync Era chainId in hex (324 in decimal)
    chainName: "zkSync Era",
    rpcUrl: "https://zksync2-mainnet.zksync.io", // Optional
    availableCollaterals: ["weth", "wsteth"], // Collaterals for zkSync
  },
};

const graiAddresses: { [chainId: number]: string } = {
  1: "0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4",      // Ethereum Mainnet
  42161: "0x894134a25a5faC1c2C26F1d8fBf05111a3CB9487",         // Arbitrum One
  324: "0x5FC44E95eaa48F9eB84Be17bd3aC66B6A82Af709",          // zkSync Era
};

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
  });
});

// Determine the network and fetch the balance using the appropriate GRAI address
async function fetchGRAIBalance(): Promise<string> {
  try {
    const network = await provider.getNetwork();
    const graiAddress = graiAddresses[Number(network.chainId)]; // Fix here

    if (!graiAddress) {
      throw new Error(`GRAI contract not available for chain ID ${network.chainId}`);
    }

    const graiContract = new ethers.Contract(graiAddress, DebtTokenArtifact.abi, signer);
    const balance = await graiContract.balanceOf(await signer.getAddress());

    return ethers.formatUnits(balance, 18); // Assume GRAI has 18 decimals
  } catch (error) {
    console.error("Error fetching GRAI balance:", error);
    return "0";
  }
}

// Handle MAX button click
document.getElementById("maxGRAI")?.addEventListener("click", async () => {
  await initialize(); // Initialize provider and signer when button is clicked

  try {
    const maxBalance = await fetchGRAIBalance();
    (document.getElementById("graiAmount") as HTMLInputElement).value = maxBalance;
  } catch (error) {
    console.error("Error setting MAX GRAI:", error);
  }
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
    const chainIdHex = "0x" + network.chainId.toString(16);

    console.log(`Current network chainId (hex): ${chainIdHex}`);

    const graiAddress = graiAddresses[network.chainId];
    if (!graiAddress) {
      console.error(`GRAI contract not available for chain ID ${network.chainId}`);
      return;
    }

    // Get user-specified GRAI amount
    const graiAmountInput = document.getElementById("graiAmount") as HTMLInputElement;
    const graiAmount = ethers.parseUnits(graiAmountInput.value || "0", 18);

    if (graiAmount <= 0n) {
      console.error("Invalid GRAI amount");
      return;
    }
    
    // See https://docs.gravitaprotocol.com/gravita-docs/about-gravita-protocol/smart-contracts
    // for contract addresses on diff chains. 
     
    //use arbitrum assignments as default
    let vessel_mgr_addr = '0x6AdAA3eBa85c77e8566b73AEfb4C2f39Df4046Ca'
    let vessel_mgr_ops_addr = '0x15f74458ae0bfdaa1a96ca1aa779d715cc1eefe4'
    let sorted_vessels_addr = '0xc49B737fa56f9142974a54F6C66055468eC631d0'
    let price_feed_addr = '0xF0e0915D233C616CB727E0b2Ca29ff0cbD51B66A'
    
    let collateralAddress: string;
          
    // Set the amount of ERN to redeem
    const LUSDAmount = graiAmount;
    
    const form = document.getElementById("collateralForm") as HTMLFormElement;
    const formData = new FormData(form);
    const collateral = formData.get("collateral") as string;
//    let collateral = "weth";
    
    if (chainIdHex=="0xa4b1")
    {
      console.log("arbitrum")
      // Set the collateral you want to redeem (ARB)
      if (collateral=='weth') {
        collateralAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1" //WETH
      }
      if (collateral=='wsteth') {
        collateralAddress = "0x5979d7b546e38e414f7e9822514be443a4800529" //wstETH
      }
      if (collateral=='reth') {
        collateralAddress = "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8" //rETH
      }
      if (collateral=='sfrxeth') {
        collateralAddress = "0x95ab45875cffdba1e5f451b950bc2e42c0053f39" //sfrxETH
      }
      if (collateral=='weeth') {
        collateralAddress = "0x35751007a407ca6feffe80b3cb397736d2cf4dbe" //weETH
      }
      
    }
    
    if (chainIdHex=="0x144")
    {
      console.log("zksync")
      vessel_mgr_addr = '0x8D9CDd9372740933702d606EaD3BB55dFfDC6303'
      vessel_mgr_ops_addr = '0x03569d4c117f94e72e9f63B06F406c5bc7caddE9'
      sorted_vessels_addr = '0x48dF3880Be9dFAAC56960325FA9a32B31fd351EA'
    
      if (collateral=='weth') {
        collateralAddress = "0x5aea5775959fbc2557cc8789bc1bf90a239d9a91" //WETH
      }
    
      if (collateral=='wsteth') {
        collateralAddress = "0x703b52f2b28febcb60e1372858af5b18849fe867" //wstETH
      }
      price_feed_addr = '0x086D0981204b3e603Bf8b70D42680DA10b4dDa31'
    }
    
    if (chainIdHex=="0x1")
      {
        console.log("mainnet")
        vessel_mgr_addr = '0xdB5DAcB1DFbe16326C3656a88017f0cB4ece0977'
        vessel_mgr_ops_addr = '0xc49B737fa56f9142974a54F6C66055468eC631d0'
        sorted_vessels_addr = '0xF31D88232F36098096d1eB69f0de48B53a1d18Ce'
        price_feed_addr = '0x89F1ecCF2644902344db02788A790551Bb070351'
      
        if (collateral=='weth') {
          collateralAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" //WETH
        }
      
        if (collateral=='wsteth') {
          collateralAddress = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" //wstETH
        }

        if (collateral=='sweth') {
          collateralAddress = "0xf951E335afb289353dc249e82926178EaC7DEd78" //swETH
        }

        if (collateral=='reth') {
          collateralAddress = "0xae78736cd615f374d3085123a210448e74fc6393" //rETH
        }

        if (collateral=='weeth') {
          collateralAddress = "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee" //weETH
        }
      }
    

      const PriceFeed = new ethers.Contract(price_feed_addr, PriceFeedArtifact.abi, signer)
      const vesselManager = new ethers.Contract(vessel_mgr_addr, VesselManagerArtifact.abi, signer);
      const vesselManagerOperations = new ethers.Contract(vessel_mgr_ops_addr, VesselManagerOperationsArtifact.abi, signer);
      const sortedVessels = new ethers.Contract(sorted_vessels_addr, SortedVesselsArtifact.abi, signer);
    
      var price = await PriceFeed.fetchPrice(collateralAddress);
      console.log(collateral, " Price: ", price);

    
       // Get the redemptions hints from the deployed HintHelpers contract
        var redemptionhint = await vesselManagerOperations.getRedemptionHints(collateralAddress, LUSDAmount, price, 50)
        console.log("Redemption hint: ", redemptionhint);
        var { 0: firstRedemptionHint, 1: partialRedemptionNewICR, 2: truncatedLUSDAmount } = redemptionhint
      
        const numTroves = await sortedVessels.getSize(collateralAddress)
        console.log("numTroves: ", numTroves);
        //const numTrials = numTroves.mul('15');
        const numTrials = numTroves * 15n;
        console.log("numTrials: ", numTrials);
        
        // Get the approximate partial redemption hint
        const { hintAddress: approxPartialRedemptionHint } = await vesselManagerOperations.getApproxHint(collateralAddress, partialRedemptionNewICR, numTrials, 42)
        
        console.log("HintAddress: ", approxPartialRedemptionHint);
    
        
        /* Use the approximate partial redemption hint to get the exact partial redemption hint from the 
        * deployed SortedTroves contract
        */
        const exactPartialRedemptionHint = (await sortedVessels.findInsertPosition(collateralAddress,partialRedemptionNewICR,
          approxPartialRedemptionHint,
          approxPartialRedemptionHint))
      
        const maxFee = ethers.parseEther("0.3")
    
        /* Finally, perform the on-chain redemption, passing the truncated LUSD amount, the correct hints, and the expected
        * ICR of the final partially redeemed trove in the sequence. 
        */
    
        console.log(      collateralAddress,
          truncatedLUSDAmount,
          firstRedemptionHint,
          exactPartialRedemptionHint[0],
          exactPartialRedemptionHint[1],
          partialRedemptionNewICR,
          0, maxFee)
    
          
    
          
        const tx = await vesselManagerOperations.redeemCollateral(
            collateralAddress,
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
  const currentChainId = `0x${network.chainId.toString(16)}`; // Convert to hex

  const selectedNetworkKey = Object.keys(networks).find(
    (key) => networks[key].chainId === currentChainId
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
  const availableCollaterals = networks[networkKey].availableCollaterals;
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
}

// Reinitialize collaterals on network change
window.ethereum.on("chainChanged", () => {
  initializeNetworkSwitcher();
});

// Initialize app on load
// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initialize();
  initializeNetworkSwitcher();
});