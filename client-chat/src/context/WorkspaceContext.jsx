import { createContext, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setWorkspace, setWorkspaceList, clearWorkspace } from '../store/workspaceSlice';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { current, list } = useSelector((s) => s.workspace);

  const switchWorkspace = (ws) => dispatch(setWorkspace(ws));
  const updateList = (workspaces) => dispatch(setWorkspaceList(workspaces));
  const resetWorkspace = () => dispatch(clearWorkspace());

  return (
    <WorkspaceContext.Provider value={{ workspace: current, workspaces: list, switchWorkspace, updateList, resetWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);

export default WorkspaceProvider;
