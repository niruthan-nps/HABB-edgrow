

import Link from 'next/link';

export default function Home() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/Login">Login</Link>
        </li>
        <li>
          <Link href="/Signup">Signup</Link>
        </li>
        <li>
          <Link href="/Study">Study</Link>
        </li>
        {/* Add more links as needed */}
      </ul>
    </nav>
  );
}