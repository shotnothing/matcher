/**
 * A class to perform K-Medoids clustering on a given distance matrix.
 */

import * as _ from "lodash";
import { random, sum } from "lodash";

export class KMedoids {
    distanceMatrix: number[][];
    nClusters: number;
    nPoints: number;
    nRange: Set<number>;
    startProb: number;
    endProb: number;
    clusters: Map<number, Set<number>> | null;
    medoids: Set<number>;

    /**
     * Creates an instance of the KMedoids class.
     * @param distanceMatrix The matrix of distances between each pair of points.
     * @param nClusters The number of clusters to form.
     * @param startProb The start probability for selecting potential medoids during initialization.
     * @param endProb The end probability for selecting potential medoids during initialization.
     */
    constructor(distanceMatrix: number[][], nClusters = 2, startProb = 0.90, endProb = 0.99) {
        if (!(0 <= startProb && startProb < endProb && endProb <= 1)) {
            throw new Error('startProb must be smaller than endProb.');
        }
        if (!(nClusters < distanceMatrix.length)) {
            throw new Error('number of clusters must not exceed number of data points.');
        }

        this.distanceMatrix = distanceMatrix;
        this.nClusters = nClusters;
        this.nPoints = distanceMatrix.length;
        this.nRange = new Set(_.range(this.nPoints));
        this.startProb = startProb;
        this.endProb = endProb;
        this.clusters = null;
        this.medoids = new Set();
    }

    /**
     * Initializes medoids using a modified K-means++ algorithm.
     * @returns A set of initial medoid indices.
     */
    initializeMedoids(): Set<number> {
        let medoids = new Set<number>();
        medoids.add(random(0, this.nPoints - 1));
        while (medoids.size !== this.nClusters) {
            const distances = Array.from(this.nRange)
                .filter(point => !medoids.has(point))
                .map(point => ({ point, distance: this.getClosestMedoid(medoids, point).distance }));

            const distancesSorted = _.sortBy(distances, 'distance');
            const startIdx = Math.floor(this.startProb * distances.length);
            const endIdx = Math.round(this.endProb * (distances.length - 1));
            const newMedoid = distancesSorted[random(startIdx, endIdx)].point;
            medoids.add(newMedoid);
        }
        return medoids;
    }

    /**
     * Calculates the distance between two points.
     * @param point1 The index of the first point.
     * @param point2 The index of the second point.
     * @returns The distance between point1 and point2.
     */
    getDistance(point1: number, point2: number): number {
        return this.distanceMatrix[point1][point2];
    }

    /**
     * Determines the closest medoid for a given point.
     * @param medoids A set of medoid indices.
     * @param point The index of the point.
     * @returns An object containing the closest medoid index and the distance to that medoid.
     */
    getClosestMedoid(medoids: Set<number>, point: number): { medoid: number, distance: number } {
        let closestMedoid = -1;
        let closestDistance = Infinity;

        medoids.forEach(medoid => {
            const distance = this.getDistance(point, medoid);
            if (distance < closestDistance) {
                closestMedoid = medoid;
                closestDistance = distance;
            }
        });

        return { medoid: closestMedoid, distance: closestDistance };
    }

    /**
     * Finds the closest point to a given medoid that is not part of the exception set.
     * @param medoid The index of the medoid.
     * @param exception A set of point indices to exclude from consideration.
     * @returns An object with the closest point and its distance to the medoid.
     */
    getClosestPoint(medoid: number, exception: Set<number>): { point: number | null, distance: number } {
        let closestPoint: number | null = null;
        let closestDistance = Infinity;

        const points = new Set([...this.nRange].filter(x => !exception.has(x)));
        points.forEach(point => {
            const distance = this.getDistance(point, medoid);
            if (distance < closestDistance) {
                closestPoint = point;
                closestDistance = distance;
            }
        });

        return { point: closestPoint, distance: closestDistance };
    }

    /**
     * Associates medoids to the closest points and calculates the configuration cost.
     * @param medoids A set of medoid indices.
     * @returns An object containing the clusters and the total configuration cost.
     */
    associateMedoidsToClosestPoint(medoids: Set<number>): { clusters: Map<number, Set<number>>, configurationCost: number } {
        const clusters = new Map<number, Set<number>>();
        const clustersCosts = new Map<number, number>();
        const alreadyAssociatedPoints = new Set<number>(medoids);
        let associatedPoints = medoids.size;

        medoids.forEach(medoid => {
            clusters.set(medoid, new Set([medoid]));
            clustersCosts.set(medoid, 0);
        });

        while (associatedPoints !== this.nPoints) {
            medoids.forEach(medoid => {
                const { point, distance } = this.getClosestPoint(medoid, alreadyAssociatedPoints);
                if (point !== null) {
                    clusters.get(medoid)!.add(point);
                    clustersCosts.set(medoid, clustersCosts.get(medoid)! + distance);
                    alreadyAssociatedPoints.add(point);
                    associatedPoints++;
                }
            });
        }

        const configurationCost = sum(Array.from(clusters.keys()).map(medoid => clustersCosts.get(medoid)! / clusters.get(medoid)!.size));
        return { clusters, configurationCost };
    }

    /**
     * Determines the set of points that are not medoids.
     * @param medoids A set of current medoid indices.
     * @returns A set of non-medoid indices.
     */
    getNonMedoids(medoids: Set<number>): Set<number> {
        return new Set([...this.nRange].filter(x => !medoids.has(x)));
    }

    /**
     * Runs the K-Medoids clustering algorithm.
     * @param maxIterations The maximum number of iterations to perform.
     * @param tolerance The tolerance for determining convergence based on configuration cost changes.
     */
    run(maxIterations = 10, tolerance = 0.01): void {
        // 1- Initialize: select k of the n data points as the medoids.
        this.medoids = this.initializeMedoids();

        // 2- Associate each medoid to the closest data point.
        let { clusters, configurationCost: currentCost } = this.associateMedoidsToClosestPoint(this.medoids);

        // 3- While the cost of the configuration decreases:
        let costChange = Infinity;
        let iteration = 0;
        while (costChange > tolerance && iteration < maxIterations) {
            costChange = 0;
            this.medoids.forEach(medoid => {
                this.getNonMedoids(this.medoids).forEach(nonMedoid => {
                    const newMedoids = new Set(this.medoids);
                    newMedoids.delete(medoid);
                    newMedoids.add(nonMedoid);

                    const { clusters: newClusters, configurationCost: newCost } = this.associateMedoidsToClosestPoint(newMedoids);
                    if (newCost < currentCost) {
                        this.medoids = newMedoids;
                        this.clusters = newClusters;
                        costChange = currentCost - newCost;
                        currentCost = newCost;
                    }
                });
            });
            iteration++;
        }
    }
}