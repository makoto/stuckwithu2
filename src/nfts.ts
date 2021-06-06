require('dotenv').config()
const gr = require('graphql-request')
const { request, gql } = gr
const url = 'https://api.opensea.io/graphql/'
const fetch = require("node-fetch");

const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('user', {
    string: true
  })
  .argv

const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import { fetchTokenholders, getOrFetch } from './utils'
import { ethers } from 'ethers';

const OPENSEA_RANKINGS_SUBGRAPH_QUERY = gql`
  query rankingsQuery{
    collections(first:30, sortBy: SEVEN_DAY_VOLUME) {
      edges {
        node {
          name
          slug
          stats{
            numOwners
          }
          assetContracts(first:100){
            edges{
              node{
                name
                symbol
                tokenStandard
                id
                blockExplorerLink
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

const polygons = [
  'zed-run-official',
  'ghxsts',
  'ethlings',
  'embersword-land',
  'voxodeus-minter',
  'malachite',
  'khabib-nurmagomedov-nft-platinum-cards',
  '1111-by-kevin-abosch',
  'doki-doki-matic',
  'polka-city-asset',
  'mirandus',
  'chillmeleons',
  'zed-run-official',
  'ghxsts',
  'ethlings',
  'embersword-land',
  'voxodeus-minter',
  'malachite',
  'khabib-nurmagomedov-nft-platinum-cards',
  '1111-by-kevin-abosch',
  'doki-doki-matic',
  'polka-city-asset',
  'mirandus',
  'chillmeleons',
]  

export const main = async () => {
  let addresses
  if(argv.csv){
    // expect that the first column contains the address
    addresses = _.slice(
        fs.readFileSync(argv.csv)
        .toString()
        .split('\n')
        .map(a => a.split(','))
        .filter(a => a[0] && a[0].match(/0x/))
        .map(a => ethers.utils.getAddress(a[0])), 1
    )
  }else if(argv.json){
  // expect the array of object with 'address' key
    addresses = JSON.parse(fs.readFileSync(argv.json).toString())
      .filter(a => a.address && a.address.match(/0x/)).map(a => ethers.utils.getAddress(a.address) )
  }else{
    throw('need --csv or --json')
  }
  console.log('***', {addresses})
  const addressDict = _.groupBy(addresses);
  console.log('***', {addressDict})
  // let result = await request(url, OPENSEA_RANKINGS_SUBGRAPH_QUERY)
  let data = {
    operationName:"rankingsQuery",
    query:OPENSEA_RANKINGS_SUBGRAPH_QUERY
  }
  let result = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  })
  const { data: { collections: { edges } } } = await result.json()
  const nfts = {}
  for (let i = 0; i < edges.length; i++) {
    const {node:{ name, slug, stats:{numOwners}, assetContracts } } = edges[i]
    console.log({
      name, slug, numOwners, assetContracts, edge:edges[i]
    })
    const contracts = assetContracts && assetContracts.edges && assetContracts.edges.map((e) => e.node)
    if(!nfts[slug]){
      nfts[slug] = {
        slug,
        addresses:{},
        numOwners
      }
    }
    for (let j = 0; j < contracts.length; j++) {
      const {symbol, blockExplorerLink } = contracts[j];
      
      const contractAddress = ethers.utils.getAddress(_.last(blockExplorerLink.split('/')))
      console.log({
        name, slug, symbol, blockExplorerLink, contractAddress
      })
      if(numOwners < 150000){
        const chainId = polygons.includes(slug) ? 137 : 1
        let balances = await getOrFetch(`./data/nfts/${slug}-${contractAddress}.json`, fetchTokenholders, [contractAddress, chainId])
        balances.map(b => {
          let a = ethers.utils.getAddress(b.address)
          // console.log({a})
          if(addressDict[a]){
            console.log('**matched', {slug, a})
            if(nfts[slug].addresses[a]){
              nfts[slug].addresses[a]=+1
            }else{
              nfts[slug].addresses[a]=1
            }
          }
        })
        console.log(balances.length)
      }else{
        console.log(`Skipping ${slug}. too big`)
      }
    }
  }
  console.log(nfts)
  
  const summary = Object.values(nfts).map((n:any, i) => {
    return {
      slug:n.slug,
      numOwners:n.numOwners,
      count:Object.values(n.addresses).length
    }
  })
  .sort((a:any,b:any) => {
    return b.count - a.count
  }).map((a:any) => console.log(`${ a.count } : ${ a.slug } : ${ a.numOwners }`))
}
console.log(argv)
main()
