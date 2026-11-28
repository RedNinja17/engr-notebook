import { useCallback, useState } from "react";
import { type SetStateAction } from "react";
import { type NodeChangeset, type EdgeChangeset } from '@xyflow/react'
import type { ProjectFile, EngineeringNode, EngineeringEdge } from "../types/project";
import { initialProject } from "../data/initialProject";

export default function useProject() {
    const [project, setProject] = useState<ProjectFile>(initialProject);
    const nodes = project.nodes;
    const edges = project.edges;

    const setNodes = useCallback(
        (updater: SetStateAction<EngineeringNode[]>) => {
            setProject(current => ({
                ...current,
                nodes: typeof updater === 'function'
                    ? updater(current.nodes)
                    : updater,
            }));
        },
        []
    );
    const setEdges = useCallback(
        (updater: SetStateAction<EngineeringEdge[]>) => {
            setProject(current => ({
                ...current,
                edges: typeof updater === 'function'
                    ? updater(current.edges)
                    : updater,
            }));
        },
        []
    );

    const onNodesChange = useCallback(
        (changes: NodeChangeset<EngineeringNode>) => {
            setProject(current => ({
                ...current,
                nodes: changes.applyTo(current.nodes),
            }));
        },
        []
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChangeset<EngineeringEdge>) => {
            setProject(current => ({
                ...current,
                edges: changes.applyTo(current.edges),
            }));
        },
        []
    );

    const loadProject = useCallback((newProject: ProjectFile) => {
        setProject(newProject);
    }, []);

    return {
        project,
        nodes,
        edges,
        setNodes,
        setEdges,
        onNodesChange,
        onEdgesChange,
        loadProject,
    };
}