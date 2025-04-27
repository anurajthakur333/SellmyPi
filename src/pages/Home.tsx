import { Card, H1 } from "@blueprintjs/core" 
import piLogo from '../pi.svg'

export const Home = () => {
  return (
    <div className="page-container">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center'}}>
          <H1>Pi Network</H1>
          <img src={piLogo} alt="Pi Network Logo" style={{ width: '68px', height: '50px' }} />
        </div>
        <p>Welcome to SellmyPi</p>
      </Card>
    </div>
  )
} 