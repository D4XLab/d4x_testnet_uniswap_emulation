import { ethers, getNamedAccounts, network } from "hardhat"
import "axios"
import "dotenv/config"
import { Address } from "hardhat-deploy/dist/types"

export async function approveErc20(
    erc20Address: string,
    spenderAddress: string,
    amount: string,
    signer: Address
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        signer
    )
    const txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log(
        `${signer} approved ${spenderAddress} to spend ${amount} of ${erc20Address}`
    )
}
