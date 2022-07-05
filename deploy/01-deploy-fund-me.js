// by default the hre is getting pass to this we are destructuring this from hre

const { networkConfig } = require("../helper-hardhat-config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // if chainId is x use the address y , we are taking this functionality from aave github code - helperhardhat config,for this we created the file helper-hardhat-config.js
    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    let ethUsdPriceFeedAddress
    if (chainId == 31337) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator") // with the get command we can just get the most recent deployment
        ethUsdPriceFeedAddress = ethUsdAggregator.address // so if we are developing locally then our deployed mock contract address will be assigned
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    log("----------------------------------------------------")
    log("Deploying FundMe and waiting for confirmations...")
    // deploying mocks - if the contract doesn't exist, we deploy a minimal version of our local testing

    // when going for localhost or hardhat network we want to use a mock
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUsdPriceFeedAddress], // put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`FundMe deployed at ${fundMe.address}`)
    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
        // verify
        await verify(fundMe.address, [ethUsdPriceFeedAddress])
    }
    log(
        "------------------------------------------------------------------------"
    )
}

module.exports.tags = ["all", "fundme"]
