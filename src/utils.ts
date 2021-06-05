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
    url = `https://blockscout.com/xdai/mainnet/api?module=account&action=txlist&address=${userAddress}`
    try{
      data = await fetch(url)
      const { result } = await data.json()
      return result
    }catch(e){
      console.log('**error', url)
      return []
    }
  }else{
    url = `https://api.covalenthq.com/v1/${chainId}/address/${userAddress}/transactions_v2/?key=${process.env.C_KEY}`
    data = await fetch(url)
    const { data:{items:items} } = await data.json() 
    return items
  }
}

export const getChainUsage = async(address) => {
  const ethereum = (await getOrFetch(`./data/transactions/${1}-${address}.json`, fetchTransactionCount, [address, 1])).length
  const polygon = (await getOrFetch(`./data/transactions/${137}-${address}.json`, fetchTransactionCount, [address, 137])).length
  const avalanche = (await getOrFetch(`./data/transactions/${43114}-${address}.json`, fetchTransactionCount, [address, 43114])).length
  const bsc = (await getOrFetch(`./data/transactions/${56}-${address}.json`, fetchTransactionCount, [address, 56])).length
  const fantom = (await getOrFetch(`./data/transactions/${250}-${address}.json`, fetchTransactionCount, [address, 250])).length
  const xdai = (await getOrFetch(`./data/transactions/${100}-${address}.json`, fetchTransactionCount, [address, 100])).length
  return({ address,ethereum,polygon,avalanche,bsc, fantom, xdai })
}

export const fetchNFTs = async (userAddress) => {
  const {data: { items } } = await getOrFetch(`./data/balances/${userAddress}.json`, fetchTokenBalances, [userAddress])
  return items.filter(i => !!i.nft_data)
}

const fetchTokenBalances = async (userAddress) => {
  if(!process.env.C_KEY){
    throw('Set process.env.C_KEY')
  }
  let pageNumber = 0
  let url = `https://api.covalenthq.com/v1/1/address/${userAddress}/balances_v2/?key=${process.env.C_KEY}&nft=true&page-number=${pageNumber}&page-size=100`
  console.log({url})
  try{
    const data = await fetch(url)
    return await data.json()  
  }catch(e){
    console.log('**error', e)
    return {data:{items:[]}}
  }
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

const getOrFetch = async(cacheFile, fetchFunc, args) => {
  if(fs.existsSync(cacheFile)){
    return JSON.parse(fs.readFileSync(cacheFile))
  } else{
    let data = await fetchFunc(...args)
    fs.writeFileSync(cacheFile, JSON.stringify(data))
    return data
  }
}


export const getTokenholders = async(tokenAddress) => {
  return getOrFetch(`./data/coins/${tokenAddress}.json`, fetchTokenholders, [tokenAddress])
}
