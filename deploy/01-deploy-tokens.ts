import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import {
    networkConfig,
    developmentChains,
    INITIAL_SUPPLY,
} from "../helper-hardhat-config"
const deployToken: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    // @ts-ignore
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId: number = network.config.chainId!

    const testDAIToken = await deploy("TestDAI", {
        from: deployer,
        args: [INITIAL_SUPPLY],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`TestDAI deployed at ${testDAIToken.address}`)

    if (
        !developmentChains.includes(network.name) &&
        networkConfig[network.name]["etherscan_api_key"]
    ) {
        var contractPath: string = "contracts/TestDAI.sol:TestDAI"
        await verify(testDAIToken.address, [INITIAL_SUPPLY], contractPath)
    }

    const testUSDTToken = await deploy("TestUSDT", {
        from: deployer,
        args: [INITIAL_SUPPLY],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`TestUSDT deployed at ${testUSDTToken.address}`)

    if (
        !developmentChains.includes(network.name) &&
        networkConfig[network.name]["etherscan_api_key"]
    ) {
        var contractPath: string = "contracts/TestUSDT.sol:TestUSDT"
        await verify(testUSDTToken.address, [INITIAL_SUPPLY], contractPath)
    }

    const testUSDCToken = await deploy("TestUSDC", {
        from: deployer,
        args: [INITIAL_SUPPLY],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`TestUSDC deployed at ${testUSDCToken.address}`)

    if (
        !developmentChains.includes(network.name) &&
        networkConfig[network.name]["etherscan_api_key"]
    ) {
        var contractPath: string = "contracts/TestUSDC.sol:TestUSDC"
        await verify(testUSDCToken.address, [INITIAL_SUPPLY], contractPath)
    }

    const wethToken = await deploy("WETH", {
        from: deployer,
        args: [INITIAL_SUPPLY],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`WETH deployed at ${wethToken.address}`)

    if (
        !developmentChains.includes(network.name) &&
        networkConfig[network.name]["etherscan_api_key"]
    ) {
        var contractPath: string = "contracts/WETH.sol:WETH"
        await verify(wethToken.address, [INITIAL_SUPPLY], contractPath)
    }
}

export default deployToken
deployToken.tags = ["all", "tokens"]
