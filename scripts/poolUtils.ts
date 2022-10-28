import { ethers, getNamedAccounts, network } from "hardhat"
import "axios"
import "dotenv/config"
import { IERC20, IUniswapV3Factory } from "../typechain-types"
import { Address } from "hardhat-deploy/dist/types"
import { BigNumberish, Contract, BigNumber } from "ethers"
import {
    Pool,
    encodeSqrtRatioX96,
    Position,
    nearestUsableTick,
    NonfungiblePositionManager,
} from "@uniswap/v3-sdk"
import { Token } from "@uniswap/sdk-core"
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"
import { abi as INonFungiblePositionManagerABI } from "@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json"
import { abi as ISwapRouterAddressABI } from "../artifacts/contracts/interfaces/ISwapRouter02.sol/ISwapRouter02.json"
import { networkConfig } from "../helper-hardhat-config"
import { approveErc20 } from "./approve"
import { JSBI } from "@uniswap/sdk"

const networkUrl: string = networkConfig[network.name]["url"]!
const chainId: number = networkConfig[network.name]["chainId"]!

const provider = new ethers.providers.JsonRpcProvider(networkUrl)

const UNISWAP_V3_FACTORY_ADDRESS =
    networkConfig[network.name]["uniswap_v3_factory_address"]!
const NON_FUNGIBLE_POSITION_MANAGER_ADDRESS =
    networkConfig[network.name]["nonfungible_position_manager_address"]!
const SWAP_ROUTER_ADDRESS = networkConfig[network.name]["swap_router_address"]!

const DAI_ADDRESS = networkConfig[network.name]["dai_address"]!
const USDC_ADDRESS = networkConfig[network.name]["usdc_address"]!
const FEE = 100
const DAI_BN_DEPOSIT = 100000 * 10 ** 18
const USDC_BN_DEPOSIT = 101000 * 10 ** 18
const LIQUIDITY_BN = 110000000 * 10 ** 18
const DAI_deposit = JSBI.BigInt(DAI_BN_DEPOSIT)
const USDC_deposit = JSBI.BigInt(USDC_BN_DEPOSIT)
const LIQUIDITY = JSBI.BigInt(LIQUIDITY_BN)

interface Immutables {
    factory: string
    token0: string
    token1: string
    fee: number
    tickSpacing: number
    maxLiquidityPerTick: BigNumber
}

interface State {
    liquidity: BigNumber
    sqrtPriceX96: BigNumber
    tick: number
    observationIndex: number
    observationCardinality: number
    observationCardinalityNext: number
    feeProtocol: number
    unlocked: boolean
}

async function getPoolImmutables(poolContract: Contract) {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
        await Promise.all([
            poolContract.factory(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.maxLiquidityPerTick(),
        ])

    const immutables: Immutables = {
        factory,
        token0,
        token1,
        fee,
        tickSpacing,
        maxLiquidityPerTick,
    }
    return immutables
}

async function getPoolState(poolContract: Contract) {
    const [liquidity, slot] = await Promise.all([
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    const PoolState: State = {
        liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
    }

    return PoolState
}

async function createPool(
    tokenA: Address,
    tokenB: Address,
    tokenADeposit: JSBI,
    tokenBDeposit: JSBI
): Promise<Address> {
    const accounts = await ethers.getSigners()
    const owner = accounts[0]!

    // get NonFungiblePositionManager
    const nonFungiblePositionManagerContract = new ethers.Contract(
        NON_FUNGIBLE_POSITION_MANAGER_ADDRESS,
        INonFungiblePositionManagerABI,
        provider
    )

    // encode price
    const sqrtPriceX96: string = getSqrtRatio(
        tokenADeposit,
        tokenBDeposit
    ).toString()
    const sqrtPriceX96BigNumber = BigNumber.from(sqrtPriceX96.toString())

    // create and/or initialize pool if necessary
    const tx = await nonFungiblePositionManagerContract
        .connect(owner)
        .createAndInitializePoolIfNecessary(
            tokenA,
            tokenB,
            FEE,
            sqrtPriceX96BigNumber
            // Try using gas limit if you encounter gas errors
            // {
            //     gasLimit: ethers.utils.hexlify(1000000),
            // }
        )
    await tx.wait()

    // get pool address
    const poolAddress: Address = await getPoolByTokensAndFee(
        tokenA,
        tokenB,
        FEE
    )

    return poolAddress
}

async function getUniswapV3Factory(
    account: Address
): Promise<IUniswapV3Factory> {
    const uniswapV3Factory: IUniswapV3Factory = await ethers.getContractAt(
        "IUniswapV3Factory",
        UNISWAP_V3_FACTORY_ADDRESS,
        account
    )
    return uniswapV3Factory
}

async function getPoolByTokensAndFee(
    tokenA: Address,
    tokenB: Address,
    fee: BigNumberish
): Promise<Address> {
    const { deployer } = await getNamedAccounts()
    const uniswapV3FactoryContract: IUniswapV3Factory =
        await getUniswapV3Factory(deployer)
    //get pool address
    const poolAddress: Address = await uniswapV3FactoryContract.getPool(
        tokenA,
        tokenB,
        fee
    )

    return poolAddress
}

function getSqrtRatio(tokenADeposit: JSBI, tokenBDeposit: JSBI): JSBI {
    const sqrtRatioX96: any = encodeSqrtRatioX96(tokenBDeposit, tokenADeposit)
    const price = sqrtRatioX96 ** 2 / 2 ** 192
    console.log(`Price: ${price} USDC for 1 DAI`)

    return sqrtRatioX96
}

async function createPosition(poolAddress: Address): Promise<void> {
    // get Pool
    const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI,
        provider
    )

    const accounts = await ethers.getSigners()
    const owner = accounts[0]!

    const [immutables, state] = await Promise.all([
        getPoolImmutables(poolContract),
        getPoolState(poolContract),
    ])

    const TokenA = new Token(chainId, immutables.token0, 18, "TDAI", "TestDAI")

    const TokenB = new Token(
        chainId,
        immutables.token1,
        18,
        "TUSDC",
        "TestUSDC"
    )

    console.log(`Current liquidity: ${state.liquidity.toString()}`)

    const poolInstance = new Pool(
        TokenA,
        TokenB,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    )

    const position = new Position({
        pool: poolInstance,
        liquidity: LIQUIDITY,
        tickLower:
            nearestUsableTick(state.tick, immutables.tickSpacing) -
            immutables.tickSpacing * 2,
        tickUpper:
            nearestUsableTick(state.tick, immutables.tickSpacing) +
            immutables.tickSpacing * 2,
    })

    // get NonFungiblePositionManager
    const nonFungiblePositionManagerContract = new ethers.Contract(
        NON_FUNGIBLE_POSITION_MANAGER_ADDRESS,
        INonFungiblePositionManagerABI,
        provider
    )

    await approveErc20(
        DAI_ADDRESS,
        nonFungiblePositionManagerContract.address,
        DAI_deposit.toString(),
        owner.address
    )

    await approveErc20(
        USDC_ADDRESS,
        nonFungiblePositionManagerContract.address,
        USDC_deposit.toString(),
        owner.address
    )

    const { amount0: amount0Desired, amount1: amount1Desired } =
        position.mintAmounts

    console.log(`amount0Desired: ${amount0Desired}`)
    console.log(`amount1Desired: ${amount1Desired}`)

    const params = {
        token0: DAI_ADDRESS,
        token1: USDC_ADDRESS,
        fee: immutables.fee,
        tickLower:
            nearestUsableTick(state.tick, immutables.tickSpacing) -
            immutables.tickSpacing * 2,
        tickUpper:
            nearestUsableTick(state.tick, immutables.tickSpacing) +
            immutables.tickSpacing * 2,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString(),
        amount0Min: "0",
        amount1Min: "0",
        recipient: owner.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    }

    const mintPosTx = await nonFungiblePositionManagerContract
        .connect(owner)
        .mint(
            params
            // Try using gas limit if you encounter gas errors
            // {
            //     gasLimit: ethers.utils.hexlify(1000000),
            // }
        )

    await mintPosTx.wait()
}

async function swapInput(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: JSBI,
    poolAddress: Address
): Promise<void> {
    const accounts = await ethers.getSigners()
    const owner = accounts[0]!

    const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI,
        provider
    )

    const immutables = await getPoolImmutables(poolContract)

    const swapRouterContract = new ethers.Contract(
        SWAP_ROUTER_ADDRESS,
        ISwapRouterAddressABI,
        provider
    )

    await approveErc20(
        tokenIn,
        swapRouterContract.address,
        amountIn.toString(),
        owner.address
    )

    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: immutables.fee,
        recipient: owner.address,
        amountIn: amountIn.toString(),
        amountOutMinimum: "0",
        sqrtPriceLimitX96: "0",
    }

    const tx = await swapRouterContract.connect(owner).exactInputSingle(
        params
        // Try using gas limit if you encounter gas errors
        // {
        //     gasLimit: ethers.utils.hexlify(1000000),
        // }
    )
    await tx.wait()
}

async function checkBalanceOf(
    addr: Address,
    tokenAddress: Address
): Promise<BigNumber> {
    const accounts = await ethers.getSigners()
    const owner = accounts[0]!

    const erc20token: IERC20 = await ethers.getContractAt(
        "IERC20",
        tokenAddress,
        owner
    )

    const balance = await erc20token.balanceOf(addr)

    return balance
}

async function main() {
    const accounts = await ethers.getSigners()
    const owner = accounts[0]!
    let poolAddress: Address = await createPool(
        DAI_ADDRESS,
        USDC_ADDRESS,
        DAI_deposit,
        USDC_deposit
    )
    poolAddress = await getPoolByTokensAndFee(DAI_ADDRESS, USDC_ADDRESS, FEE)
    console.log(
        `Pool for tokens ${DAI_ADDRESS} and ${USDC_ADDRESS} at ${poolAddress}`
    )

    await createPosition(poolAddress)

    const poolBalanceDAI = await checkBalanceOf(poolAddress, DAI_ADDRESS)
    const poolBalanceUSDC = await checkBalanceOf(poolAddress, USDC_ADDRESS)
    console.log(`DAI in pool after creating position: ${poolBalanceDAI}`)
    console.log(`USDC in pool after creating position: ${poolBalanceUSDC}`)
    const ownerBalanceDAI = await checkBalanceOf(owner.address, DAI_ADDRESS)
    const ownerBalanceUSDC = await checkBalanceOf(owner.address, USDC_ADDRESS)
    console.log(
        `DAI on owners balance after creating position: ${ownerBalanceDAI}`
    )
    console.log(
        `USDC on owners balance after creating position: ${ownerBalanceUSDC}`
    )

    // Testing swap
    const swapAmount = JSBI.BigInt(10 * 10 ** 18)
    await swapInput(DAI_ADDRESS, USDC_ADDRESS, swapAmount, poolAddress)
    const poolBalanceDAIAfter = await checkBalanceOf(poolAddress, DAI_ADDRESS)
    const poolBalanceUSDCAfter = await checkBalanceOf(poolAddress, USDC_ADDRESS)
    console.log(`DAI in pool after swap: ${poolBalanceDAIAfter}`)
    console.log(`USDC in pool after swap: ${poolBalanceUSDCAfter}`)
    const ownerBalanceDAIAfter = await checkBalanceOf(
        owner.address,
        DAI_ADDRESS
    )
    const ownerBalanceUSDCAfter = await checkBalanceOf(
        owner.address,
        USDC_ADDRESS
    )
    console.log(`DAI on owners balance after swap: ${ownerBalanceDAIAfter}`)
    console.log(`USDC on owners balance after swap: ${ownerBalanceUSDCAfter}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
