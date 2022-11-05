export interface networkConfigItem {
    blockConfirmations?: number
    url?: string
    chainId?: number
    dai_address?: string
    usdc_address?: string
    usdt_address?: string
    nonfungible_position_manager_address?: string
    uniswap_v3_factory_address?: string
    swap_router_address?: string
    etherscan_api_key?: string
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    localhost: {},
    hardhat: {},
    optimisticGoerli: {
        blockConfirmations: 6,
        url: process.env.OPT_GOERLI_RPC_URL,
        chainId: 420,
        dai_address: "0x312C1C8F5BC23f08331B1486Da723dd1B80F9040",
        usdc_address: "0xEA2aa731c7493BeC9DfB3663E6A9888269d269bF",
        usdt_address: "0x7bF76F5Eac3f6993cd880f7c12c1f299A129387d",
        nonfungible_position_manager_address:
            "0x3E3bedb16cEf30C7B07F410F329B9425bACfAdEc",
        uniswap_v3_factory_address:
            "0x5c18D5e2F6e162CE192B5996EDbB38e100711167",
        swap_router_address: "0x8DB3b09D50CA3E303A06d993A210ab61eB9f6Ea3",
        etherscan_api_key: process.env.OPT_ETHERSCAN_API_KEY,
    },
    polygonMumbai: {
        blockConfirmations: 6,
        url: process.env.MUMBAI_RPC_URL,
        chainId: 80001,
        dai_address: "0xF6fEd63aAF618d25050e5E3d3B4c525ab2154554",
        usdc_address: "0x2D7eB0e8802d3a530E298a1f94ce176ad6B3Ab43",
        usdt_address: "0x60965aB564AD3D6069577027DB5d1a43e5AD06a6",
        nonfungible_position_manager_address:
            "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        uniswap_v3_factory_address:
            "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        swap_router_address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        etherscan_api_key: process.env.MUMBAI_ETHERSCAN_API_KEY,
    },
}

export const INITIAL_SUPPLY = "1000000000000000000000000000"

export const developmentChains = ["hardhat", "localhost"]
