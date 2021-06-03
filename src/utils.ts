import {uniq, uniqBy} from 'lodash'
import { ethers } from 'ethers';
import namehash from 'eth-ens-namehash';
import _ from 'lodash'
const fs = require('fs');
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


export const fetchTransactionCount = async (userAddress, chainId) => {
  let url, data
  if(!process.env.C_KEY){
    throw('Set process.env.C_KEY')
  }
  if(chainId === 100){
    url = `https://blockscout.com/xdai/mainnet/address-counters?id=${userAddress}`
    try{
      data = await fetch(url)
      const json = await data.json()
      return parseInt(json && json.transaction_count)
    }catch(e){
      return 0
    }
  }else{
    url = `https://api.covalenthq.com/v1/${chainId}/address/${userAddress}/transactions_v2/?key=${process.env.C_KEY}`
    data = await fetch(url)
    const { data:{items:items} } = await data.json() 
    return items.length
  }
}

const fetchChainUsage = async(address) => {
  const ethereum = await fetchTransactionCount(address, 1)
  const polygon = await fetchTransactionCount(address, 137)
  const avalanche = await fetchTransactionCount(address, 43114)
  const bsc = await fetchTransactionCount(address, 56)
  const fantom = await fetchTransactionCount(address, 250)    
  const xdai = await fetchTransactionCount(address, 100)
  return({ address,ethereum,polygon,avalanche,bsc, fantom, xdai })
}

export const getChainUsage = async(userAddress) => {
  return getOrFetch(`./data/chains/${userAddress}.json`, fetchChainUsage, userAddress)
}

export const fetchTokenBalances = async (userAddress) => {
  if(!process.env.C_KEY){
    throw('Set process.env.C_KEY')
  }
  let pageNumber = 0
  let url = `https://api.covalenthq.com/v1/1/address/${userAddress}/balances_v2/?key=${process.env.C_KEY}&nft=true&page-number=${pageNumber}&page-size=100`

  let data = await fetch(url)
  let {data:{items:items}} = await data.json()
  console.log({url})
  items.map(i => {
    if(i.nft_data){
      const { contract_name, contract_ticker_symbol, nft_data } = i
      console.log({
        contract_name, contract_ticker_symbol, nft_data_length:nft_data.length,nft_data:nft_data.map(n => {
          if(n.external_data){
            const { name, image, attributes } = n.external_data
            return {
              name,image, attributes
            }  
          }else{
            return {}
          }
        })
      })
    }
  })
}


const fetchTokenholders = async (token_address) => {
  if(!process.env.C_KEY){
    throw('Set process.env.C_KEY')
  }
  
  let pageNumber = 0
  let has_more = true
  let total_items = []
  let total_count
  while(has_more){
    let url = `https://api.covalenthq.com/v1/1/tokens/${token_address}/token_holders/?key=${process.env.C_KEY}&page-number=${pageNumber}&page-size=100`
    console.log({
      token_address,
      pageNumber,
      ckey:process.env.C_KEY
    })

    let data = await fetch(url)
    console.log({data})
    let {data:{items:items, pagination:pagination}} = await data.json()

    has_more = pagination.has_more
    pageNumber = pagination.page_number + 1
    total_count = pagination.total_count
    let filtered = items.map(i=> {
      return {
        balance:parseInt(i.balance),
        address:i.address
      }
    }).filter(i => i.balance > 0 )
    total_items = [...total_items, ...filtered
    ]
  }
  console.log('***total_items', total_items.length, total_count)    
  return total_items
}

const getOrFetch = async(cacheFile, fetchFunc, arg1) => {
  if(fs.existsSync(cacheFile)){
    return JSON.parse(fs.readFileSync(cacheFile))
  } else{
    let data = await fetchFunc(arg1)
    fs.writeFileSync(cacheFile, JSON.stringify(data))
    return data
  }
}


export const getTokenholders = async(tokenAddress) => {
  return getOrFetch(`./data/coins/${tokenAddress}.json`, fetchTokenholders, tokenAddress)
}
