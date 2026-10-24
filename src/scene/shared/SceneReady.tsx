// Se pone al final de un Suspense: como solo se monta cuando ha cargado todo lo de dentro, avisa de que esa parte de
// la escena ya está (lo espera la pantalla de carga)
import { useEffect } from 'react'
import { markSceneReady } from '@/utils/sceneReady'
import type { ScenePart } from '@/utils/sceneReady'

function SceneReady({ part }: { part: ScenePart }) {
  useEffect(() => markSceneReady(part), [part])
  return null
}

export default SceneReady
