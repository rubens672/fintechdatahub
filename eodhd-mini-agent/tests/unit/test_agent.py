# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from app.agent import app, custom_toolset, root_agent


def test_agent_configuration():
    """Verify that root agent has consolidated Custom MCP toolset and valid instructions."""
    assert root_agent.name == "root_agent"
    assert len(root_agent.tools) == 1
    assert custom_toolset in root_agent.tools
    assert "Financial Intelligence" in root_agent.instruction
    assert "NEVER fabricate data" in root_agent.instruction


def test_app_configuration():
    """Verify that the ADK App is configured with root_agent."""
    assert app.name == "app"
    assert app.root_agent is root_agent

