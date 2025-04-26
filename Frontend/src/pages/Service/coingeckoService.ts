// Link to get Pi coin prices
const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd,inr'

// Get USD and INR prices
const getPiPrice = async () => {
  const data = await (await fetch(URL)).json()

  // Show price with 4 numbers after dot (like 1.2345)
  return {
    usd: data['pi-network'].usd.toFixed(4),
    inr: data['pi-network'].inr.toFixed(4)
  }
}
// Make getPiPrice available to use in other files
export default getPiPrice