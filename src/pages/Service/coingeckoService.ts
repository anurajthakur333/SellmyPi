// Link to get Pi coin prices
const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd,inr'

// Get USD and INR prices with reduced values
const getPiPrice = async () => {
  const data = await (await fetch(URL)).json()

  // Reduce prices to show lower values
  const reducedInr = data['pi-network'].inr * 0.5; // Reduce to 10% of original price
  const reducedUsd = data['pi-network'].usd * 0.5; // Reduce to 10% of original price

  return {
    usd: reducedUsd.toFixed(4),
    inr: reducedInr.toFixed(4)
  }
}

// Make getPiPrice available to use in other files
export default getPiPrice