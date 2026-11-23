import { ArrowRight, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'
import '../benchline.css'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <main className="landing-screen">
        <section className="landing-card">
          <div className="landing-brand">
            <span className="bench-logo"><Wrench size={18} /></span>
            <span>{APP_NAME} <small>· REPAIR CAFÉ SHIFTBOARD</small></span>
          </div>
          <div className="landing-eyebrow">FOR COMMUNITY REPAIR TEAMS</div>
          <h1>Keep good things in use.</h1>
          <p>Benchline helps volunteer repair teams turn intake into clear bench work, track parts, and hand each repair to the next person without losing context.</p>
          <div className="landing-points">
            <span>Shared repair queue</span>
            <span>Parts & next steps</span>
            <span>Live volunteer handoff</span>
          </div>
          <Link to="/home" className="landing-link">Open the shiftboard <ArrowRight size={15} /></Link>
        </section>
      </main>
    </>
  )
}