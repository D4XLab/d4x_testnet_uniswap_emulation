// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "./libraries/TransferHelper.sol";
import "./interfaces/ISwapRouter.sol";

contract SwapExamples {
    // For the scope of these swap examples,
    // we will detail the design considerations when using
    // `exactInput`, `exactInputSingle`, `exactOutput`, and  `exactOutputSingle`.

    // It should be noted that for the sake of simplicity, we purposefully pass in the swap router instead of inheriting the swap router in these examples.
    // More advanced example contracts will detail how to inherit the swap router safely.

    ISwapRouter public swapRouter;

    // This example swaps tokenA/WETH9 for single path swaps and tokenA/USDC/WETH9 for multipath swaps.

    address public tokenA;
    address public tokenB;
    address public WETH;

    uint24 public poolFee;

    function setSwapRouter(address swapRouterAddress) public {
        swapRouter = ISwapRouter(swapRouterAddress);
    }

    function setPoolVariables(
        address tokenAAddress,
        address tokenBAddress,
        address WETHAddress,
        uint24 fee
    ) public {
        tokenA = tokenAAddress;
        tokenB = tokenBAddress;
        WETH = WETHAddress;
        poolFee = fee;
    }

    function transferIn(uint256 amountIn) public {
        // Transfer the specified amount of tokenA to this contract.
        TransferHelper.safeTransferFrom(
            tokenA,
            msg.sender,
            address(this),
            amountIn
        );
    }

    function approveSwapRouter(uint256 amountIn) public {
        // Approve the router to spend tokenA.
        TransferHelper.safeApprove(tokenA, address(swapRouter), amountIn);
    }

    function approveThis(uint256 amountIn) public {
        // Approve the router to spend tokenA.
        TransferHelper.safeApprove(tokenA, address(this), amountIn);
    }

    /// @notice swapExactInputSingle swaps a fixed amount of tokenA for a maximum possible amount of tokenB
    /// using the tokenA/tokenB fee pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its tokenA for this function to succeed.
    /// @param amountIn The exact amount of tokenA that will be swapped for WETH9.
    /// @return amountOut The amount of tokenB received.
    function swapExactInputSingle(uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenA,
                tokenOut: tokenB,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    /// @notice swapExactOutputSingle swaps a minimum possible amount of tokenA for a fixed amount of tokenB.
    /// @dev The calling address must approve this contract to spend its tokenA for this function to succeed. As the amount of input tokenA is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param amountOut The exact amount of tokenB to receive from the swap.
    /// @param amountInMaximum The amount of tokenA we are willing to spend to receive the specified amount of tokenB.
    /// @return amountIn The amount of tokenA actually spent in the swap.
    function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum)
        external
        returns (uint256 amountIn)
    {
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: tokenA,
                tokenOut: tokenB,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        amountIn = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender and approve the swapRouter to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(tokenA, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                tokenA,
                msg.sender,
                amountInMaximum - amountIn
            );
        }
    }

    /// @notice swapInputMultiplePools swaps a fixed amount of tokenA for a maximum possible amount of tokenB through an intermediary pool.
    /// For this example, we will swap tokenA to WETH, then WETH to tokenB to achieve our desired output.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its tokenA for this function to succeed.
    /// @param amountIn The amount of tokenA to be swapped.
    /// @return amountOut The amount of tokenB received after the swap.
    function swapExactInputMultihop(uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        // Multiple pool swaps are encoded through bytes called a `path`. A path is a sequence of token addresses and poolFees that define the pools used in the swaps.
        // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut) where tokenIn/tokenOut parameter is the shared token across the pools.
        // Since we are swapping tokenA to WETH and then WETH to tokenB the path encoding is (tokenA, fee, WETH, fee, tokenB).
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: abi.encodePacked(tokenA, poolFee, WETH, poolFee, tokenB),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            });

        // Executes the swap.
        amountOut = swapRouter.exactInput(params);
    }

    /// @notice swapExactOutputMultihop swaps a minimum possible amount of tokenA for a fixed amount of WETH through an intermediary pool.
    /// For this example, we want to swap tokenA for tokenB through a WETH pool but we specify the desired amountOut of tokenB. Notice how the path encoding is slightly different for exact output swaps.
    /// @dev The calling address must approve this contract to spend its tokenA for this function to succeed. As the amount of input tokenA is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param amountOut The desired amount of tokenB.
    /// @param amountInMaximum The maximum amount of tokenA willing to be swapped for the specified amountOut of tokenB.
    /// @return amountIn The amountIn of tokenA actually spent to receive the desired amountOut.
    function swapExactOutputMultihop(uint256 amountOut, uint256 amountInMaximum)
        external
        returns (uint256 amountIn)
    {
        // The parameter path is encoded as (tokenOut, fee, tokenIn/tokenOut, fee, tokenIn)
        // The tokenIn/tokenOut field is the shared token between the two pools used in the multiple pool swap. In this case, USDC is the "shared" token.
        // For an exactOutput swap, the first swap that occurs is the swap that returns the eventually desired token.
        // In this case, our desired output token is tokenB so that swap happens first, and is encoded in the path accordingly.
        ISwapRouter.ExactOutputParams memory params = ISwapRouter
            .ExactOutputParams({
                path: abi.encodePacked(tokenB, poolFee, WETH, poolFee, tokenA),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            });

        // Executes the swap, returning the amountIn actually spent.
        amountIn = swapRouter.exactOutput(params);

        // If the swap did not require the full amountInMaximum to achieve the exact amountOut then we refund msg.sender and approve the router to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(tokenA, address(swapRouter), 0);
            TransferHelper.safeTransferFrom(
                tokenA,
                address(this),
                msg.sender,
                amountInMaximum - amountIn
            );
        }
    }
}
