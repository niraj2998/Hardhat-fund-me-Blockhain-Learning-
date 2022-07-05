const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")

const chainId = network.config.chainId

if (chainId == 31337) {
    describe("FundMe", async () => {
        let fundMe
        let deployer
        let mockV3Aggregator
        const sendValue = ethers.utils.parseEther("1") // 1 Eth
        beforeEach(async () => {
            // deploy our fundMe contract
            // using Hardhat-deploy
            // const accounts = await ethers.getSingers() It gives the list of accounts based on the network
            // const accountZero = accounts[0]
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            // fixture function allows us to run the entire deploy folder with as many functions as we want
            fundMe = await ethers.getContract("FundMe", deployer)
            // this function will get the most recent deployment of the contract we tell it, we can also tell whic account we want to be connected with fund me.
            mockV3Aggregator = await ethers.getContract(
                "MockV3Aggregator",
                deployer
            )
        })

        describe("Constructor", async () => {
            it("sets the aggregator addresses correctly", async () => {
                const response = await fundMe.getPriceFeed()
                assert.equal(response, mockV3Aggregator.address)
            })
        })

        describe("fund", async () => {
            // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
            // could also do assert.fail
            it("Fails if you don't send enough ETH", async () => {
                await expect(fundMe.fund()).to.be.reverted
            })
            it("updated the amound funded data structure", async () => {
                await fundMe.fund({ value: sendValue })
                // response will be in the form of the big number
                const response = await fundMe.getAddressToAmountFunded(deployer)
                assert.equal(response.toString(), sendValue.toString())
            })
            it("Adds funder to array of funders", async () => {
                await fundMe.fund({ value: sendValue })
                const funder = await fundMe.getFunder(0)
                assert.equal(funder, deployer)
            })
        })

        describe("Withdraw", async () => {
            beforeEach(async () => {
                await fundMe.fund({ value: sendValue })
            })

            it("withdraw ETH from a single founder", async () => {
                // Arrange
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)
                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                // as this are big number we will use big numbers method to do math operations
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )
                // Assert
                assert.equal(endingFundMeBalance, 0)
                // here deployer has also sepnd the gas on transaction we should also consider that
                assert.equal(
                    startingFundMeBalance.add(startingDeployerBalance),
                    endingDeployerBalance.add(gasCost).toString()
                )
            })
            it("Allows us to withdraw with multiple funder", async () => {
                const accounts = await ethers.getSigners()
                for (let i = 2; i < 7; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                // as this are big number we will use big numbers method to do math operations
                const gasCost = gasUsed.mul(effectiveGasPrice)
                // Assert
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )
                // Assert
                assert.equal(endingFundMeBalance, 0)
                // here deployer has also sepnd the gas on transaction we should also consider that
                assert.equal(
                    startingFundMeBalance.add(startingDeployerBalance),
                    endingDeployerBalance.add(gasCost).toString()
                )

                // make sure getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (i = 2; i < 7; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })
            it("Only allows the owner to withdraw", async () => {
                const accounts = await ethers.getSigners()
                const attacker = accounts[2]
                const attackerConnectedToContract = await fundMe.connect(
                    attacker
                )
                await expect(attackerConnectedToContract.withdraw()).to.be
                    .reverted
            })
            it("Cheaper withdraw from a single founder", async () => {
                // Arrange
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)
                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                // as this are big number we will use big numbers method to do math operations
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )
                // Assert
                assert.equal(endingFundMeBalance, 0)
                // here deployer has also sepnd the gas on transaction we should also consider that
                assert.equal(
                    startingFundMeBalance.add(startingDeployerBalance),
                    endingDeployerBalance.add(gasCost).toString()
                )
            })
            it("Cheaper withdraw testing with multiple funder", async () => {
                const accounts = await ethers.getSigners()
                for (let i = 2; i < 7; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                // as this are big number we will use big numbers method to do math operations
                const gasCost = gasUsed.mul(effectiveGasPrice)
                // Assert
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )
                // Assert
                assert.equal(endingFundMeBalance, 0)
                // here deployer has also sepnd the gas on transaction we should also consider that
                assert.equal(
                    startingFundMeBalance.add(startingDeployerBalance),
                    endingDeployerBalance.add(gasCost).toString()
                )

                // make sure getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (i = 2; i < 7; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })
        })
    })
} else {
    describe.skip
}
