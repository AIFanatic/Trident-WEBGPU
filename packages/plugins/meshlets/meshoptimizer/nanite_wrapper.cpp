// For reference, see the original Nanite paper:
// Brian Karis. Nanite: A Deep Dive. 2021
#include "./ec2ee8b/src/meshoptimizer.h"

#include <float.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

#include <algorithm>
#include <vector>

#define CLUSTERLOD_IMPLEMENTATION
#include "./ec2ee8b/demo/clusterlod.h"

struct Vertex
{
	float px, py, pz;
	float nx, ny, nz;
	float ux, uy;
	float tx, ty, tz, tw;
};

struct GroupRuntime
{
    float center[3];
    float radius;
    float error;   // clodGroup::simplified.error  (monotonic)
    int   depth;   // optional but useful (debug / stats)
};

struct MeshletRuntime
{
    float center[3];
    float radius;
	float error;
    uint32_t index_offset;   // into global index buffer
    uint32_t index_count;
    int32_t  group_id;       // which group this meshlet belongs to
    int32_t  refined_group;  // clodCluster::refined (or -1)
};

static std::vector<GroupRuntime>  out_groups;
static std::vector<MeshletRuntime> out_meshlets;
static std::vector<uint32_t>      out_indices;

extern "C" {
size_t group_count() { return out_groups.size(); }
size_t meshlet_count() { return out_meshlets.size(); }
size_t meshlet_indices_count() { return out_indices.size(); }

const GroupRuntime* group_ptr() { return out_groups.data(); }
const MeshletRuntime* meshlet_ptr() { return out_meshlets.data(); }
const uint32_t* meshlet_indices_ptr() { return out_indices.data(); }

void nanite(const Vertex* _vertices, size_t vertex_count, const unsigned int* _indices, size_t index_count) {
	clodConfig config = clodDefaultConfig(/*max_triangles=*/128);
	
	const float attribute_weights[3] = {0.5f, 0.5f, 0.5f};
	
	std::vector<Vertex> vertices(_vertices, _vertices + vertex_count);
	std::vector<unsigned int> indices(_indices, _indices + index_count);

	clodMesh mesh = {};
	mesh.indices = indices.data();
	mesh.index_count = indices.size();
	mesh.vertex_count = vertices.size();
	mesh.vertex_positions = &vertices[0].px;
	mesh.vertex_positions_stride = sizeof(Vertex);
	mesh.vertex_attributes = &vertices[0].nx;
	mesh.vertex_attributes_stride = sizeof(Vertex);
	mesh.attribute_weights = attribute_weights;
	mesh.attribute_count = sizeof(attribute_weights) / sizeof(attribute_weights[0]);
	mesh.attribute_protect_mask = (1 << 3) | (1 << 4); // protect UV seams, maps to Vertex::ux/uy

	out_groups.clear();
	out_meshlets.clear();
	out_indices.clear();

	clodBuild(config, mesh,
		[&](clodGroup group, const clodCluster* clusters, size_t cluster_count) -> int
	{
		int group_id = int(out_groups.size());

		GroupRuntime gr{};
		gr.center[0] = group.simplified.center[0];
		gr.center[1] = group.simplified.center[1];
		gr.center[2] = group.simplified.center[2];
		gr.radius    = group.simplified.radius;
		gr.error     = group.simplified.error; // MONOTONIC one
		gr.depth     = group.depth;
		out_groups.push_back(gr);

		for (size_t k = 0; k < cluster_count; ++k)
		{
			const clodCluster& c = clusters[k];

			uint32_t off = (uint32_t)out_indices.size();
			out_indices.insert(out_indices.end(), c.indices, c.indices + c.index_count);

			MeshletRuntime mr{};
			mr.center[0] = c.bounds.center[0];
			mr.center[1] = c.bounds.center[1];
			mr.center[2] = c.bounds.center[2];
			mr.radius = c.bounds.radius;
			mr.error = c.bounds.error;
			mr.index_offset  = off;
			mr.index_count   = (uint32_t)c.index_count;
			mr.group_id      = group_id;
			mr.refined_group = c.refined; // group id of more detailed group, or -1
			out_meshlets.push_back(mr);
		}

		return group_id;
	});
}
}