import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import {
    networkConfig,
    developmentChains,
    INITIAL_SUPPLY,
} from "../helper-hardhat-config"
import { Console } from "console"
const deploySwapExamples: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    // @ts-ignore
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId: number = network.config.chainId!

    const swapExamples = await deploy("SwapExamples", {
        from: deployer,
        args: [],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`SwapExamples deployed at ${swapExamples.address}`)

    if (
        !developmentChains.includes(network.name) &&
        networkConfig[network.name]["etherscan_api_key"]
    ) {
        var contractPath: string = "contracts/SwapExamples.sol:SwapExamples"
        await verify(swapExamples.address, [], contractPath)
    }
}

export default deploySwapExamples
deploySwapExamples.tags = ["all", "swapExamples"]
