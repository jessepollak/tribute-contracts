const { prepareVoteProposalPayload } = require("@openlaw/snapshot-js-erc712");
const { ethers } = require("ethers");
const toBytes32 = ethers.utils.formatBytes32String;
const { sha3, fromAscii } = require("../../../utils/ContractUtil");
const { entryDao, parseDaoFlags } = require("../../../utils/DeploymentUtil");
const { getContract } = require("../utils/contract");
const { newProposal } = require("../utils/snapshot");

const newManagingProposal = async (
  adapterName,
  adapterAddress,
  keys,
  values,
  aclFlags,
  data,
  opts
) => {
  console.log(`New managing proposal`);
  console.log(`\tNetwork:\t\t${opts.network}`);
  console.log(`\tDAO:\t\t\t${opts.dao}`);
  console.log(`\tSpace:\t\t\t${opts.space}`);
  console.log(`\tManagingContract:\t${opts.contract}`);
  console.log(`\tAdapter:\t\t${adapterName} @ ${adapterAddress}`);
  console.log(`\tAccessFlags:\t\t${aclFlags}`);
  console.log(`\tKeys:\t\t\t${keys}`);
  console.log(`\tValues:\t\t\t${values}`);
  console.log(`\tData:\t\t\t${data}`);

  const configKeys = keys.split(",").map((k) => toBytes32(k));
  const configValues = values.split(",").map((v) => v);

  const { contract, provider, wallet } = getContract(
    "ManagingContract",
    opts.network,
    opts.contract
  );

  await newProposal(
    `Adapter: ${adapterName}`,
    "Creates/Update adapter",
    opts.network,
    opts.dao,
    opts.space,
    opts.contract,
    provider,
    wallet
  )
    .then(async (res) => {
      console.log(res);
      const newData = {
        timestamp: res.data.timestamp,
        spaceHash: res.erc712Message.spaceHash,
        payload: prepareVoteProposalPayload(res.data.payload),
        sig: res.erc712Message.sig,
      };
      console.log(newData);
      const encodedData = ethers.utils._TypedDataEncoder.encode(
        {
          ProposalMessage: {
            timestamp: "uint64",
            spaceHash: "bytes32",
            payload: {
              nameHash: "bytes32",
              bodyHash: "bytes32",
              choices: "string[]",
              start: "uint64",
              end: "uint64",
              snapshot: "string",
            },
            sig: "bytes",
          },
        },
        newData
      );
      console.log(encodedData);
      await contract.submitProposal(
        opts.dao,
        sha3(res.uniqueId),
        {
          adapterId: sha3(adapterName),
          adapterAddress: adapterAddress,
          flags: entryDao(
            adapterName,
            { address: adapterAddress },
            parseDaoFlags(aclFlags)
          ).flags,
        },
        configKeys,
        configValues,
        data ? encodedData : []
      );
      return sha3(res.uniqueId);
    })
    .then((proposalId) => console.log(`New DAO proposal: ${proposalId}`));
};

module.exports = { newManagingProposal };
