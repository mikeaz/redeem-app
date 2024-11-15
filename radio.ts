// Import everything
import { ethers } from "ethers";

// Import just a few select items
import { BrowserProvider, parseUnits } from "ethers";

// Import from a specific export
import { HDNodeWallet } from "ethers/wallet";

const networks = {
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
  
      await provider.send("wallet_switchEthereumChain", [{ chainId: "0x144" }]);
  
      // When sending a transaction, the value is in wei, so parseEther
      // converts ether to wei.
      const tx = await signer.sendTransaction({
          to: "0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4",
          data: "0x40a44bd100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000003635c9adc5dea00000000000000000000000000000f72ee810a67e753e81dfda70500851f016ca312a0000000000000000000000005734e56b389f345fe32abc1a6c54d49152284f79000000000000000000000000891a534e7fbf12d34e74e9fffa8f6fe28158d0d300000000000000000000000000000000000000000000000001527af5aa837afd00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000",
          value: ethers.parseEther("0")
      });
      
      // Often you may wish to wait until the transaction is mined
      const receipt = await tx.wait();
      

    
    } catch (error) {
      console.error("Error:", error);
    }
  });