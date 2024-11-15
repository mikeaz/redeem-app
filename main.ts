// Import everything
import { ethers } from "ethers";

// Import just a few select items
import { BrowserProvider, parseUnits } from "ethers";

// Import from a specific export
import { HDNodeWallet } from "ethers/wallet";

const networks = {
  eth: {
    chainId: "0x1", // Arbitrum One chainId in hex (42161 in decimal)
    chainName: "Ethereum Mainnet",
    rpcUrl: "wss://ethereum-rpc.publicnode.com", // Optional, mainly handled by Rabby
  },
  arbitrum: {
    chainId: "0xa4b1", // Arbitrum One chainId in hex (42161 in decimal)
    chainName: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc", // Optional, mainly handled by Rabby
  },
  zksync: {
    chainId: "0x144", // zkSync Era chainId in hex (324 in decimal)
    chainName: "zkSync Era",
    rpcUrl: "https://zksync2-mainnet.zksync.io", // Optional
  },
};

async function switchNetwork(chainId: string) {
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

// Handle form submission
document.getElementById("switchNetwork")?.addEventListener("click", () => {
  const form = document.getElementById("networkForm") as HTMLFormElement;
  const formData = new FormData(form);
  const selectedNetwork = formData.get("network") as string;

  if (selectedNetwork && networks[selectedNetwork]) {
    switchNetwork(networks[selectedNetwork].chainId);
  } else {
    alert("Invalid network selection");
  }
});

// Wait for the DOM to be ready
document.getElementById("sendTx")?.addEventListener("click", async () => {
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

    //await provider.send("wallet_switchEthereumChain", [{ chainId: "0x144" }]); //zksync
    //await provider.send("wallet_switchEthereumChain", [{ chainId: "0xa4b1" }]); //arbitrum


    // When sending a transaction, the value is in wei, so parseEther
    // converts ether to wei.
    const tx = await signer.sendTransaction({
        to: "0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4",
        data: "0x40a44bd100000000000000000000000035751007a407ca6feffe80b3cb397736d2cf4dbe000000000000000000000000000000000000000000000087751f4e0e1b530000000000000000000000000000310fe7f4adff6921d4f9b9630c9a7bb00fcb7f49000000000000000000000000a8bb72e53cc08410295b3abfb8e9b5c896c854d4000000000000000000000000d707ea46c8e5d8ea0e171625d1da770a8fed59f7000000000000000000000000000000000000000000000000034c0fd876957d3a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000",
        value: ethers.parseEther("0")
    });
    
    // Often you may wish to wait until the transaction is mined
    const receipt = await tx.wait();
    
/*
    // Transaction details
    const tx = {
        to: "0x03569d4c117f94e72e9f63B06F406c5bc7caddE9", // Replace with actual contract address
        data: "0x03569d4c117f94e72e9f63B06F406c5bc7caddE9", // Replace with encoded transaction data
        //value: ethers.utils.parseEther("0"), // Optional ETH value
        //value: "0", // Optional ETH value
        value: ethers.parseUnits("0"), // Optional ETH value
        };
    
    // Send the transaction
    const txResponse = signer.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);

    // Wait for confirmation
    const receipt = await txResponse.wait();
    console.log("Transaction confirmed:", receipt);
*/

    /*
    // Connect to Rabby Wallet
    //const provider = new ethers.providers.Web3Provider(window.ethereum);
    const provider = new ethers.JsonRpcProvider();
    const signer = await provider.getSigner();

    // Ensure the user is on zkSync Era
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0x144" }]);

    // Transaction details
    const tx = {
      to: "0x03569d4c117f94e72e9f63B06F406c5bc7caddE9", // Replace with actual contract address
      data: "0x40a44bd10000000000000000000000005aea5775959fbc2557cc8789bc1bf90a239d9a9100000000000000000000000000000000000000000000003635c9adc5dea00000000000000000000000000000fb713e80e5222f62dcf978c0859e64dced3bb2840000000000000000000000002308e6ef5debb4db9b56ce58ec85a6c88b3f35aa000000000000000000000000132e47cf2c19ec2d8dd56e1528fc7e18dc09188f00000000000000000000000000000000000000000000000000efb381301c504500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000", // Replace with encoded transaction data
      //value: ethers.utils.parseEther("0"), // Optional ETH value
      value: "0", // Optional ETH value
    };

    // Send the transaction
    const txResponse = await signer.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);

    // Wait for confirmation
    const receipt = await txResponse.wait();
    console.log("Transaction confirmed:", receipt);
    */
  } catch (error) {
    console.error("Error:", error);
  }
});