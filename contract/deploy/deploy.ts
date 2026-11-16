import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const whiteout = await deploy("Whiteout", {
    from: deployer,
    log: true,
  });

  console.log(`Whiteout contract: `, whiteout.address);
};
export default func;
func.id = "deploy_whiteout"; // id required to prevent reexecution
func.tags = ["Whiteout"];
