import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "dotenv/config"
import "hardhat-deploy"
import "@typechain/hardhat"

const OPT_GOERLI_RPC_URL = process.env.OPT_GOERLI_RPC_URL || ""
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const OPT_ETHERSCAN_API_KEY = process.env.OPT_ETHERSCAN_API_KEY || ""
const MUMBAI_ETHERSCAN_API_KEY = process.env.MUMBAI_ETHERSCAN_API_KEY || ""

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.7.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {},
        optimisticGoerli: {
            url: OPT_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 420,
            saveDeployments: true,
            allowUnlimitedContractSize: true,
        },
        polygonMumbai: {
            url: MUMBAI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 80001,
            saveDeployments: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
            420: 0,
            80001: 1,
        },
    },
    etherscan: {
        apiKey: {
            optimisticGoerli: OPT_ETHERSCAN_API_KEY,
            polygonMumbai: MUMBAI_ETHERSCAN_API_KEY,
        },
    },
}

export default config
