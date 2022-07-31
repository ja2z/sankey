import "./App.css";

import { useMemo, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as highchartsSankey from "highcharts/modules/sankey";
//npm install highcharts highcharts-react-official highcharts-sankey

import { client, useConfig, useElementData } from "@sigmacomputing/plugin";

highchartsSankey(Highcharts);

client.config.configureEditorPanel([
  { name: "source", type: "element" },
  { name: "dimension", type: "column", source: "source", allowMultiple: true },
  { name: "measures", type: "column", source: "source", allowMultiple: true },
]);

function App() {
  const config = useConfig();
  const sigmaData = useElementData(config.source);
  const ref = useRef();
  const options = useMemo(() => {
    const dimensions = config.dimension;
    const measures = config.measures;

    // transform sigmaData --> sankey data
    let uniquePair = {};
    let uniqueParentPair = {};
    if (dimensions && sigmaData?.[dimensions[0]]) {
      for (let i = 0; i < dimensions.length - 1; i++) {
        for (let j = 0; j < sigmaData[dimensions[i]].length; j++) {

          // get parent path of node
          let parent = "";
          if (i === 0) {
            parent = "_root";
          } else {
            for (let k = 0; k <= i - 1; k++) {
              parent = parent + "||" + sigmaData[dimensions[k]][j];
            }
          }

          const from = sigmaData[dimensions[i]][j];
          const to = sigmaData[dimensions[i + 1]][j];
          const weight = sigmaData[measures[i]][j];

          // dedupe parent rows
          if (uniqueParentPair[parent] === undefined)
            uniqueParentPair[parent] = {};
          if (uniqueParentPair[parent][from] === undefined)
            uniqueParentPair[parent][from] = {};
          uniqueParentPair[parent][from][to] = weight;
        }
      }

      // hash agg pairs
      for (let parent in uniqueParentPair) {
        for (let from in uniqueParentPair[parent]) {
          for (let to in uniqueParentPair[parent][from]) {
            const weight = uniqueParentPair[parent][from][to];
            if (uniquePair[from] === undefined) uniquePair[from] = {};
            // Do the actual hash agg
            // If the from/to pair doesn't exist, create it with the weight
            // If it already exists in the hash map, add weight to existing weight
            uniquePair[from][to] =
              uniquePair[from][to] === undefined
                ? weight
                : uniquePair[from][to] + weight;
          }
        }
      }

      // xform agg pairs into array that Sankey chart likes
      let data = [];
      let i = 0;
      for (let from in uniquePair) {
        for (let to in uniquePair[from]) {
          const weight = uniquePair[from][to];
          data[i] = [from, to, weight];
          i++;
        }
      }

      // Sankey Highcharts formatting options
      const options = {
        title: {
          text: undefined,
        },
        chart: {
          height: window.innerHeight,
          backgroundColor: "transparent",
        },
        accessibility: {
          point: {
            valueDescriptionFormat:
              "{index} {point.from} to {point.to}, {point.weight}.",
          },
        },
        tooltip: {
          pointFormat: "{point.from} → {point.to}: {point.weight:,.0f}",
          nodeFormat: "{point.name}: {point.sum:,.0f}",
        },
        series: [
          {
            keys: ["from", "to", "weight"],
            data: data,
            type: "sankey",
            name: "Sankey demo series",
          },
        ],
      };
      return options;
    }
  }, [config, sigmaData]);

  return (
    <div>
      <HighchartsReact highcharts={Highcharts} options={options} ref={ref} />
    </div>
  );
}

export default App;
