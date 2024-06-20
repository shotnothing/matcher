import { useState } from 'react'

import { KMedoids } from './matching/kmedoids.tsx'

import './App.css'

function App() {

  const km: KMedoids = new KMedoids([
    [0, 1, 2, 3, 4],
    [1, 0, 1, 2, 3],
    [2, 1, 0, 1, 2],
    [3, 2, 1, 0, 1],
    [4, 3, 2, 1, 0],
  ], 2) 

  km.run();
  console.log("Medoids:", km.medoids);
  console.log("Clusters:", km.clusters);

  return (
    <>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
        {`${km.clusters}`}
      </p>
    </>
  )
}

export default App
