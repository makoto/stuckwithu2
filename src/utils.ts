import {uniq, uniqBy} from 'lodash'
import { ethers } from 'ethers';
import namehash from 'eth-ens-namehash';
import _ from 'lodash'
const fetch = require("node-fetch");

// ReverseRecord contract on Mainnet. Use Mainnet ENS as main data source regardless of the network you connect to
let address = '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'
let abi = [{"inputs":[{"internalType":"contract ENS","name":"_ens","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address[]","name":"addresses","type":"address[]"}],"name":"getNames","outputs":[{"internalType":"string[]","name":"r","type":"string[]"}],"stateMutability":"view","type":"function"}]

// TODO: Refactor to render as it returns data rather than waiting all in batch
export const getEnsData = async (ownerIds) => {
  if(!process.env.RPC_PROVIDER_URL){
    throw('Set process.env.RPC_PROVIDER_URL')
  }
  
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_PROVIDER_URL);
  const ReverseRecords = new ethers.Contract(address, abi, provider)
  
  const chunked = _.chunk(ownerIds, 50)
  let allnames = []
  for (let i = 0; i < chunked.length; i++) {
    const chunk = chunked[i];
    let names
    try{
    // TODO: Figure out why some call throws error
    names = await ReverseRecords.getNames(chunk)
    }catch(e){
    // Fallback to null if problem fetching Reverse record
    console.log(e)
    names = chunk.map(a => null)
    }
    const validNames = names.map(name => (namehash.normalize(name) === name && name !== '') && name )
    allnames = _.concat(allnames, validNames);
  }
  return allnames
}

export const fetchTokenholders = async (token_address) => {
  if(!process.env.C_KEY){
    throw('Set process.env.C_KEY')
  }
  
  let pageNumber = 0
  let has_more = true
  let total_items = []
  let total_count
  // while(has_more){
    let url = `https://api.covalenthq.com/v1/1/tokens/${token_address}/token_holders?key=${process.env.C_KEY}&page-number=${pageNumber}&page-size=100`
    console.log({
      token_address,
      pageNumber,
      ckey:process.env.C_KEY
    })

    let data = await fetch(url)
    console.log({data})
    //   let {data:{items:items, pagination:pagination}} = await data.json()

  //   has_more = pagination.has_more
  //   pageNumber = pagination.page_number + 1
  //   total_count = pagination.total_count
  //   let filtered = items.map(i=> {
  //     return {
  //       balance:parseInt(i.balance),
  //       address:i.address
  //     }
  //   }).filter(i => i.balance > 0 )
  //   total_items = [...total_items, ...filtered
  //   ]
  // }
  // console.log('***total_items', total_items.length, total_count)    
  // return total_items
}